const { Op, fn, col } = require('sequelize');
const { Task, JobApplication } = require('../models');
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
  {
    type: 'function',
    function: {
      name: 'searchTasksByCompany',
      description: "Search the user's tasks for ones mentioning a given company or keyword in the title or description.",
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: 'Company name or keyword to search for, e.g. "GPMorgan"' },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getOverdueOrUpcomingTasks',
      description: "Get the user's tasks that are overdue or due within the next N days. Use this for questions about deadlines, what's due soon, or what's overdue.",
      parameters: {
        type: 'object',
        properties: {
          withinDays: { type: 'number', description: 'How many days ahead to look, default 7' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTaskCountsByStatus',
      description: "Get a count of the user's tasks grouped by status (todo, in_progress, done). Use this for summary/overview questions.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchJobsByCompany',
      description: "Search the user's job applications for ones at a given company. Use this for questions about a specific company's application status, e.g. 'did I apply to Stripe?'.",
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: 'Company name to search for, e.g. "Stripe"' },
        },
        required: ['companyName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJobsNeedingFollowUp',
      description: "Get the user's job applications whose follow-up date is due within N days and that aren't already closed (offer/rejected/withdrawn). Use this for 'which companies do I need to follow up with' questions.",
      parameters: {
        type: 'object',
        properties: {
          withinDays: { type: 'number', description: 'How many days ahead to look, default 7' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getJobCountsByStatus',
      description: "Get a count of the user's job applications grouped by pipeline stage (wishlist, applied, oa, interviewing, offer, rejected, withdrawn). Use for job-hunt overview questions like 'how many interviews do I have going'.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'queryJobApplications',
      description:
        "Flexible search over the user's job applications, filtered by pipeline stage and/or date. Use this whenever a question combines a STAGE with a TIME, e.g. 'do I have any online assessments on 10th July?', 'which interviews are coming up this week?', 'what did I apply to in June?'. Pipeline stages and their synonyms: wishlist (saved/interested); applied (applied/submitted); oa (ONLINE ASSESSMENT / OA / coding test / take-home / assessment); interviewing (interview / interview round / phone screen / onsite); offer; rejected; withdrawn. So an 'online assessment' or 'OA' means stage 'oa'; an 'interview' means stage 'interviewing'. Dates filter on next_follow_up by default (the scheduled next-action date on a card); pass dateField 'applied_date' to filter by when they applied. Use onDate for a single day, or fromDate/toDate for an inclusive range. All dates are YYYY-MM-DD.",
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            enum: ['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'],
            description: "Pipeline stage to filter by. 'oa' = online assessment/test; 'interviewing' = interview.",
          },
          companyName: { type: 'string', description: 'Optional company name to narrow to one company.' },
          onDate: { type: 'string', description: 'A single calendar day, YYYY-MM-DD.' },
          fromDate: { type: 'string', description: 'Range start (inclusive), YYYY-MM-DD.' },
          toDate: { type: 'string', description: 'Range end (inclusive), YYYY-MM-DD.' },
          dateField: {
            type: 'string',
            enum: ['next_follow_up', 'applied_date'],
            description: 'Which date column to filter on. Default next_follow_up.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'searchGmail',
      description:
        "Search the user's connected Gmail inbox using Gmail's own search operators, and return matching messages' sender, recipient, subject, date, and a short snippet. Use this for questions about the user's actual emails, e.g. 'which companies did I email yesterday' or 'did I get a reply from Stripe'. Construct the gmailQuery using real Gmail search syntax: from:, to:, subject:, after:YYYY/MM/DD, before:YYYY/MM/DD, newer_than:2d, is:sent, etc. If the user isn't connected to Gmail, the tool will say so.",
      parameters: {
        type: 'object',
        properties: {
          gmailQuery: {
            type: 'string',
            description: 'A Gmail search query using Gmail operators, e.g. "is:sent to:stripe.com newer_than:2d"',
          },
          maxResults: { type: 'number', description: 'Max messages to return, 1-20, default 10' },
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
  searchGmail,
};

module.exports = { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS };
