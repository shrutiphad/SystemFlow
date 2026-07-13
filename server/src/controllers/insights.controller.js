const { Op, fn, col, literal } = require('sequelize');
const { Task, JobApplication, Contact } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// All numbers here come from SQL COUNT/GROUP BY (never by fetching rows and
// counting in JS - see CLAUDE.md), and every query is scoped by user_id so one
// user's analytics can never include another's data.

const JOB_STATUSES = ['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'];
const TASK_STATUSES = ['todo', 'in_progress', 'done'];
const CONTACT_STATUSES = ['to_contact', 'contacted', 'responded', 'referred', 'closed'];

// Turn [{key, count}] raw rows into a zero-filled object over a fixed key set,
// so the client always gets every bucket (including the empty ones).
function tally(rows, keyField, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => {
    const k = r[keyField];
    if (k in out) out[k] = Number(r.count);
  });
  return out;
}

const getInsights = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Last 6 calendar months for the applications-over-time trend.
  const since = new Date();
  since.setMonth(since.getMonth() - 5);
  since.setDate(1);
  const sinceDate = since.toISOString().slice(0, 10);

  const monthExpr = literal("to_char(date_trunc('month', created_at), 'YYYY-MM')");

  const [
    jobsByStatusRaw,
    jobsBySourceRaw,
    tasksByStatusRaw,
    contactsByStatusRaw,
    appsOverTimeRaw,
    totalApplications,
    totalContacts,
    totalTasks,
  ] = await Promise.all([
    JobApplication.findAll({
      where: { user_id: userId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    JobApplication.findAll({
      where: { user_id: userId },
      attributes: ['source', [fn('COUNT', col('id')), 'count']],
      group: ['source'],
      raw: true,
    }),
    Task.findAll({
      where: { user_id: userId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Contact.findAll({
      where: { user_id: userId },
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    }),
    JobApplication.findAll({
      where: { user_id: userId, created_at: { [Op.gte]: sinceDate } },
      attributes: [[monthExpr, 'month'], [fn('COUNT', col('id')), 'count']],
      group: [monthExpr],
      order: [[monthExpr, 'ASC']],
      raw: true,
    }),
    JobApplication.count({ where: { user_id: userId } }),
    Contact.count({ where: { user_id: userId } }),
    Task.count({ where: { user_id: userId } }),
  ]);

  const jobsByStatus = tally(jobsByStatusRaw, 'status', JOB_STATUSES);
  const tasksByStatus = tally(tasksByStatusRaw, 'status', TASK_STATUSES);
  const contactsByStatus = tally(contactsByStatusRaw, 'status', CONTACT_STATUSES);

  // Source can be null; label those as 'unknown' for the breakdown.
  const jobsBySource = {};
  jobsBySourceRaw.forEach((r) => {
    jobsBySource[r.source || 'unknown'] = Number(r.count);
  });

  const applicationsOverTime = appsOverTimeRaw.map((r) => ({ month: r.month, count: Number(r.count) }));

  // A couple of derived headline metrics, computed from the aggregates above.
  const activePipeline = jobsByStatus.applied + jobsByStatus.oa + jobsByStatus.interviewing;
  const advanced = jobsByStatus.oa + jobsByStatus.interviewing + jobsByStatus.offer;
  // Response rate: of everything actually submitted (not wishlist), how much
  // advanced past the initial application.
  const submitted = totalApplications - jobsByStatus.wishlist;
  const responseRate = submitted > 0 ? Math.round((advanced / submitted) * 100) : 0;

  res.status(200).json({
    totals: {
      applications: totalApplications,
      contacts: totalContacts,
      tasks: totalTasks,
      offers: jobsByStatus.offer,
      activePipeline,
      responseRate,
    },
    jobsByStatus,
    jobsBySource,
    tasksByStatus,
    contactsByStatus,
    applicationsOverTime,
  });
});

module.exports = { getInsights };
