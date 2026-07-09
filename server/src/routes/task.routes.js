const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const requireAuth = require('../middleware/auth.middleware');
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} = require('../controllers/task.controller');

const router = express.Router();
router.use(requireAuth);

const createTaskRules = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).isString(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date'),
];

const updateTaskRules = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).isString(),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('due_date').optional({ nullable: true }).isISO8601().withMessage('due_date must be a valid date'),
];

router.get(
  '/',
  [
    query('status').optional().isIn(['todo', 'in_progress', 'done']),
    query('priority').optional().isIn(['low', 'medium', 'high']),
    query('sortBy').optional().isIn(['due_date', 'created_at']),
    query('order').optional().isIn(['asc', 'desc', 'ASC', 'DESC']),
  ],
  validate,
  getTasks
);

router.get('/:id', [param('id').isUUID()], validate, getTaskById);
router.post('/', createTaskRules, validate, createTask);
router.put('/:id', [param('id').isUUID(), ...updateTaskRules], validate, updateTask);
router.delete('/:id', [param('id').isUUID()], validate, deleteTask);

module.exports = router;
