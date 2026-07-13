const { Op, fn, col } = require('sequelize');
const { Task, JobApplication, Contact } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [total, byStatusRaw, overdue] = await Promise.all([
    Task.count({ where: { user_id: userId } }),
    Task.findAll({
      where: { user_id: userId },
      attributes: ['status', [fn('COUNT', col('status')), 'count']],
      group: ['status'],
      raw: true,
    }),
    Task.count({
      where: {
        user_id: userId,
        status: { [Op.ne]: 'done' },
        due_date: { [Op.lt]: new Date().toISOString().slice(0, 10) },
      },
    }),
  ]);

  const byStatus = { todo: 0, in_progress: 0, done: 0 };
  byStatusRaw.forEach((row) => {
    byStatus[row.status] = Number(row.count);
  });

  res.status(200).json({ total, byStatus, overdue });
});

// GET /api/dashboard/agenda
// The action list for the landing page: open job applications and network
// contacts whose follow-up falls on/before `withinDays` from today. Both queries
// are scoped by user_id and filtered/sorted in SQL (never fetch-all-then-filter),
// so the dashboard only ever pulls the handful of rows it renders.
const getAgenda = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const withinDays = Math.min(Math.max(Number(req.query.withinDays) || 7, 1), 60);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const [jobs, contacts] = await Promise.all([
    JobApplication.findAll({
      where: {
        user_id: userId,
        status: { [Op.notIn]: ['offer', 'rejected', 'withdrawn'] },
        next_follow_up: { [Op.lte]: horizonStr },
      },
      order: [['next_follow_up', 'ASC']],
      limit: 8,
    }),
    Contact.findAll({
      where: {
        user_id: userId,
        status: { [Op.ne]: 'closed' },
        next_follow_up: { [Op.lte]: horizonStr },
      },
      order: [['next_follow_up', 'ASC']],
      limit: 8,
    }),
  ]);

  res.status(200).json({
    today,
    jobs: jobs.map((j) => ({
      id: j.id,
      company_name: j.company_name,
      role_title: j.role_title,
      status: j.status,
      next_follow_up: j.next_follow_up,
      overdue: j.next_follow_up < today,
    })),
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      company_name: c.company_name,
      status: c.status,
      next_follow_up: c.next_follow_up,
      overdue: c.next_follow_up < today,
    })),
  });
});

module.exports = { getSummary, getAgenda };
