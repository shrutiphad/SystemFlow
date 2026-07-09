const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const requireAuth = require('../middleware/auth.middleware');
const {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
} = require('../controllers/jobApplication.controller');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'];
const SOURCES = ['linkedin', 'naukri', 'company_site', 'referral', 'other'];

// Shared between create and update: every optional field with its constraints.
const optionalFieldRules = [
  body('role_title').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('portal').optional({ nullable: true }).isString().isLength({ max: 60 }),
  body('job_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false })
    .withMessage('job_url must be a valid URL')
    .isLength({ max: 500 }),
  body('location').optional({ nullable: true }).isString().isLength({ max: 120 }),
  body('salary_range').optional({ nullable: true }).isString().isLength({ max: 80 }),
  body('source').optional({ nullable: true }).isIn(SOURCES).withMessage(`source must be one of: ${SOURCES.join(', ')}`),
  body('excitement')
    .optional({ nullable: true })
    .isInt({ min: 1, max: 5 })
    .withMessage('excitement must be an integer from 1 to 5'),
  body('status').optional().isIn(STATUSES),
  body('outreach_sent').optional().isBoolean(),
  body('applied_date').optional({ nullable: true }).isISO8601().withMessage('applied_date must be a valid date'),
  body('next_follow_up').optional({ nullable: true }).isISO8601().withMessage('next_follow_up must be a valid date'),
  body('notes').optional({ nullable: true }).isString(),
];

const createJobRules = [
  body('company_name').trim().notEmpty().withMessage('Company name is required').isLength({ max: 150 }),
  ...optionalFieldRules,
];

const updateJobRules = [
  body('company_name').optional().trim().notEmpty().withMessage('Company name cannot be empty').isLength({ max: 150 }),
  ...optionalFieldRules,
];

router.get('/', [query('status').optional().isIn(STATUSES)], validate, getJobs);
router.get('/:id', [param('id').isUUID()], validate, getJobById);
router.post('/', createJobRules, validate, createJob);
router.put('/:id', [param('id').isUUID(), ...updateJobRules], validate, updateJob);
router.patch('/:id/status', [param('id').isUUID(), body('status').isIn(STATUSES)], validate, updateJobStatus);
router.delete('/:id', [param('id').isUUID()], validate, deleteJob);

module.exports = router;
