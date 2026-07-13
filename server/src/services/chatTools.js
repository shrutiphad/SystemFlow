const { Op, fn, col } = require('sequelize');
const { Task, JobApplication, Contact } = require('../models');
const gmailService = require('./gmail.client');

// ---------------------------------------------------------------------
// Every function here is a real, scoped, parameterised query - identical
// in spirit to what task.controller.js already does. The LLM never sees
// or supplies `userId`; the chat controller injects it from the
// authenticated request, exactly like `req.user.id` in the REST routes.
// The LLM only ever sees the JSON schemas in TOOL_DEFINITIONS below, which
// deliberately do NOT include a userId parameter - there is no way for a
// model to even attempt to ask for someone else's data.
// ---------------------------------------------------------------------

async function searchTasksByCompany(userId, { companyName }) {
  const tasks = await Task.findAll({
    where: {
      user_id: userId,
      [Op.or]: [
        { title: { [Op.iLike]: `%${companyName}%` } },
        { description: { [Op.iLike]: `%${companyName}%` } },
      ],
    },
    order: [['created_at', 'DESC']],
    limit: 20,
  });
  return tasks.map(serializeTask);
}

async function getOverdueOrUpcomingTasks(userId, { withinDays = 7 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const tasks = await Task.findAll({
    where: {
      user_id: userId,
      status: { [Op.ne]: 'done' },
      due_date: { [Op.lte]: horizonStr },
    },
    order: [['due_date', 'ASC']],
    limit: 30,
  });

  return tasks.map((t) => ({ ...serializeTask(t), overdue: t.due_date < today }));
}

async function getTaskCountsByStatus(userId) {
  const rows = await Task.findAll({
    where: { user_id: userId },
    attributes: ['status', [fn('COUNT', col('status')), 'count']],
    group: ['status'],
    raw: true,
  });
  const counts = { todo: 0, in_progress: 0, done: 0 };
  rows.forEach((r) => { counts[r.status] = Number(r.count); });
  return counts;
}

function serializeTask(t) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    due_date: t.due_date,
  };
}

// ---- Job-application tools (Phase 2) --------------------------------------
// Same scoping guarantee as the task tools: userId is injected by the chat
// controller, never exposed in any schema below.

async function searchJobsByCompany(userId, { companyName }) {
  const jobs = await JobApplication.findAll({
    where: {
      user_id: userId,
      company_name: { [Op.iLike]: `%${companyName}%` },
    },
    order: [['created_at', 'DESC']],
    limit: 20,
  });
  return jobs.map(serializeJob);
}

async function getJobsNeedingFollowUp(userId, { withinDays = 7 } = {}) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const jobs = await JobApplication.findAll({
    where: {
      user_id: userId,
      status: { [Op.notIn]: ['offer', 'rejected', 'withdrawn'] },
      next_follow_up: { [Op.lte]: horizonStr },
    },
    order: [['next_follow_up', 'ASC']],
    limit: 30,
  });
  return jobs.map(serializeJob);
}

async function getJobCountsByStatus(userId) {
  const rows = await JobApplication.findAll({
    where: { user_id: userId },
    attributes: ['status', [fn('COUNT', col('status')), 'count']],
    group: ['status'],
    raw: true,
  });
  const counts = { wishlist: 0, applied: 0, oa: 0, interviewing: 0, offer: 0, rejected: 0, withdrawn: 0 };
  rows.forEach((r) => { counts[r.status] = Number(r.count); });
  return counts;
}

// Flexible stage + date search. This is the tool that lets the assistant answer
// "do I have any online assessments on 10 July?" (stage 'oa', onDate that day)
// or "which interviews are coming up this week?" (stage 'interviewing', a range).
// Without it, the model had no way to combine a pipeline stage with a date - the
// gap that made those questions silently return nothing.
async function queryJobApplications(
  userId,
  { stage, companyName, onDate, fromDate, toDate, dateField = 'next_follow_up' } = {}
) {
  const where = { user_id: userId };

  if (stage) {
    const stages = (Array.isArray(stage) ? stage : [stage]).filter((s) => STAGE_LABELS[s]);
    if (stages.length) where.status = { [Op.in]: stages };
  }

  if (companyName) {
    where.company_name = { [Op.iLike]: `%${companyName}%` };
  }

  // Only allow filtering on the two real date columns - never an arbitrary field.
  const field = ['next_follow_up', 'applied_date'].includes(dateField) ? dateField : 'next_follow_up';

  if (onDate) {
    where[field] = onDate;
  } else if (fromDate || toDate) {
    const range = {};
    if (fromDate) range[Op.gte] = fromDate;
    if (toDate) range[Op.lte] = toDate;
    where[field] = range;
  }

  const jobs = await JobApplication.findAll({
    where,
    order: [[field, 'ASC'], ['created_at', 'DESC']],
    limit: 50,
  });
  return jobs.map(serializeJob);
}

// Human-readable stage names, shared by the serializer and the query tool so the
// model always sees "Online Assessment" alongside the raw `oa` enum value.
const STAGE_LABELS = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  oa: 'Online Assessment',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

function serializeJob(j) {
  return {
    id: j.id,
    company_name: j.company_name,
    role_title: j.role_title,
    portal: j.portal,
    source: j.source,
    location: j.location,
    job_url: j.job_url,
    excitement: j.excitement,
    status: j.status,
    stage_label: STAGE_LABELS[j.status] || j.status,
    outreach_sent: j.outreach_sent,
    applied_date: j.applied_date,
    next_follow_up: j.next_follow_up,
  };
}

// ---- Contact / Network tools ---------------------------------------------
// The networking CRM. Same scoping guarantee as every tool above: userId is
// injected by the chat controller, never exposed in any schema.

async function searchContactsByName(userId, { query }) {
  const contacts = await Contact.findAll({
    where: {
      user_id: userId,
      [Op.or]: [
        { name: { [Op.iLike]: `%${query}%` } },
        { company_name: { [Op.iLike]: `%${query}%` } },
      ],
    },
    order: [['created_at', 'DESC']],
    limit: 20,
  });
  return contacts.map(serializeContact);
}

async function getContactsNeedingFollowUp(userId, { withinDays = 7 } = {}) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const contacts = await Contact.findAll({
    where: {
      user_id: userId,
      status: { [Op.ne]: 'closed' },
      next_follow_up: { [Op.lte]: horizonStr },
    },
    order: [['next_follow_up', 'ASC']],
    limit: 30,
  });
  return contacts.map(serializeContact);
}

async function getContactCountsByStatus(userId) {
  const rows = await Contact.findAll({
    where: { user_id: userId },
    attributes: ['status', [fn('COUNT', col('status')), 'count']],
    group: ['status'],
    raw: true,
  });
  const counts = { to_contact: 0, contacted: 0, responded: 0, referred: 0, closed: 0 };
  rows.forEach((r) => { counts[r.status] = Number(r.count); });
  return counts;
}

const CONTACT_STATUS_LABELS = {
  to_contact: 'To contact', contacted: 'Contacted', responded: 'Responded',
  referred: 'Referred', closed: 'Closed',
};

function serializeContact(c) {
  return {
    id: c.id,
    name: c.name,
    role_title: c.role_title,
    company_name: c.company_name,
    email: c.email,
    relationship: c.relationship,
    status: c.status,
    status_label: CONTACT_STATUS_LABELS[c.status] || c.status,
    next_follow_up: c.next_follow_up,
    last_contacted: c.last_contacted,
  };
}

// ---- Gmail tool (Phase 3) -------------------------------------------------
// The LLM constructs a real Gmail search query string using Gmail's own
// operators (from:, to:, subject:, after:, before:, newer_than:, etc.) and
// this runs it live against the user's inbox via the Gmail API. Read-only,
// scoped to the authenticated user's own connection. Returns metadata +
// snippet only, never full bodies. If the user hasn't connected Gmail, the
// tool result says so and the assistant relays that.

async function searchGmail(userId, { gmailQuery, maxResults = 10 }) {
  if (!gmailQuery || typeof gmailQuery !== 'string') {
    return { connected: null, error: 'A gmailQuery string is required' };
  }
  const capped = Math.min(Math.max(Number(maxResults) || 10, 1), 20);
  const result = await gmailService.searchMessages(userId, gmailQuery, capped);
  if (!result.connected) {
    return { connected: false, message: 'Gmail is not connected for this user.' };
  }
  return { connected: true, count: result.messages.length, messages: result.messages };
}

// JSON-schema tool definitions handed to Groq. This is the ONLY interface
// the model has into this app's data - it cannot run arbitrary SQL, it can
// only request one of these three named, fixed-shape operations.
const TOOL_DEFINITIONS = [
  // Descriptions are intentionally terse: they are re-sent on every chat request
  // and count against Groq's token budget. The system prompt carries the shared
  // stage vocabulary, so each tool only needs its own one-line purpose.
  {
    type: 'function',
    function: {
      name: 'searchTasksByCompany',
      description: "Find the user's tasks matching a company/keyword in the title or description.",
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: 'Company name or keyword, e.g. "GPMorgan"' },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getOverdueOrUpcomingTasks',
      description: "The user's tasks overdue or due within N days (deadlines / what's due soon / overdue).",
      parameters: {
        type: 'object',
        properties: {
          withinDays: { type: 'number', description: 'Days ahead to look, default 7' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTaskCountsByStatus',
      description: 'Count the user\'s tasks by status (todo, in_progress, done). For task overviews.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchJobsByCompany',
      description: "Find the user's job applications at a given company, e.g. 'did I apply to Stripe?'.",
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: 'Company name, e.g. "Stripe"' },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJobsNeedingFollowUp',
      description: "Open applications whose follow-up is due within N days. For 'who do I need to follow up with'.",
      parameters: {
        type: 'object',
        properties: {
          withinDays: { type: 'number', description: 'Days ahead to look, default 7' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJobCountsByStatus',
      description: 'Count job applications by pipeline stage. For job-hunt overviews.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queryJobApplications',
      description:
        "Job applications filtered by stage and/or date. Use whenever a question pairs a stage with a time, e.g. 'online assessments on 10th July?' (stage 'oa', onDate) or 'interviews this week?' (stage 'interviewing', date range). Dates filter next_follow_up by default; onDate for one day, fromDate/toDate for a range (YYYY-MM-DD).",
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            enum: ['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'],
          },
          companyName: { type: 'string', description: 'Optional: narrow to one company.' },
          onDate: { type: 'string', description: 'Single day, YYYY-MM-DD.' },
          fromDate: { type: 'string', description: 'Range start (inclusive), YYYY-MM-DD.' },
          toDate: { type: 'string', description: 'Range end (inclusive), YYYY-MM-DD.' },
          dateField: { type: 'string', enum: ['next_follow_up', 'applied_date'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchContactsByName',
      description: "Find people in the user's networking contacts by name or company, e.g. 'who's my contact at Stripe?'.",
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'A person name or company, e.g. "Stripe" or "Priya"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getContactsNeedingFollowUp',
      description: "Contacts whose follow-up is due within N days. For 'who should I reach out to / follow up with in my network'.",
      parameters: {
        type: 'object',
        properties: {
          withinDays: { type: 'number', description: 'Days ahead to look, default 7' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getContactCountsByStatus',
      description: 'Count networking contacts by outreach stage (to_contact, contacted, responded, referred, closed). For network overviews.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchGmail',
      description:
        "Search the user's connected Gmail (read-only) and return sender/recipient/subject/date/snippet. Build gmailQuery with real Gmail operators (from:, to:, subject:, after:YYYY/MM/DD, newer_than:2d, is:sent). If not connected, the tool says so.",
      parameters: {
        type: 'object',
        properties: {
          gmailQuery: { type: 'string', description: 'Gmail query, e.g. "is:sent to:stripe.com newer_than:2d"' },
          maxResults: { type: 'number', description: '1-20, default 10' },
        },
        required: ['gmailQuery'],
      },
    },
  },
];

// Maps a tool name (as returned by Groq) to the real function that runs it.
const TOOL_IMPLEMENTATIONS = {
  searchTasksByCompany,
  getOverdueOrUpcomingTasks,
  getTaskCountsByStatus,
  searchJobsByCompany,
  getJobsNeedingFollowUp,
  getJobCountsByStatus,
  queryJobApplications,
  searchContactsByName,
  getContactsNeedingFollowUp,
  getContactCountsByStatus,
  searchGmail,
};

module.exports = { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS };
