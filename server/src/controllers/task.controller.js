const { Task } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const ALLOWED_SORT_FIELDS = { due_date: 'due_date', created_at: 'created_at' };

const getTasks = asyncHandler(async (req, res) => {
  const { status, priority, sortBy, order } = req.query;
  const where = { user_id: req.user.id };
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const sortField = ALLOWED_SORT_FIELDS[sortBy] || 'created_at';
  const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const tasks = await Task.findAll({ where, order: [[sortField, sortOrder]] });
  res.status(200).json({ tasks, count: tasks.length });
});

const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.status(200).json({ task });
});

const createTask = asyncHandler(async (req, res) => {
  const { title, description, priority, status, due_date } = req.body;
  const task = await Task.create({ title, description, priority, status, due_date, user_id: req.user.id });
  res.status(201).json({ task });
});

const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });

  const { title, description, priority, status, due_date } = req.body;
  await task.update({
    ...(title !== undefined && { title }),
    ...(description !== undefined && { description }),
    ...(priority !== undefined && { priority }),
    ...(status !== undefined && { status }),
    ...(due_date !== undefined && { due_date }),
  });
  res.status(200).json({ task });
});

const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  await task.destroy();
  res.status(200).json({ message: 'Task deleted', id: req.params.id });
});

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask };
