const { Op, fn, col } = require('sequelize');
const { Task } = require('../models');
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

module.exports = { getSummary };
