const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const requireAuth = require('../middleware/auth.middleware');
const {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} = require('../controllers/contact.controller');

const router = express.Router();
router.use(requireAuth);

const STATUSES = ['to_contact', 'contacted', 'responded', 'referred', 'closed'];
const RELATIONSHIPS = ['recruiter', 'referral', 'hiring_manager', 'colleague', 'alumni', 'mentor', 'other'];

// Shared between create and update: every optional field with its constraints.
const optionalFieldRules = [
  body('role_title').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('company_name').optional({ nullable: true }).isString().isLength({ max: 150 }),
  body('email')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage('email must be valid')
    .isLength({ max: 200 }),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 40 }),
  body('linkedin_url')
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: false }).withMessage('linkedin_url must be a valid URL')
    .isLength({ max: 500 }),
  body('relationship')
    .optional({ nullable: true })
    .isIn(RELATIONSHIPS).withMessage(`relationship must be one of: ${RELATIONSHIPS.join(', ')}`),
  body('status').optional().isIn(STATUSES),
  body('last_contacted').optional({ nullable: true }).isISO8601().withMessage('last_contacted must be a valid date'),
  body('next_follow_up').optional({ nullable: true }).isISO8601().withMessage('next_follow_up must be a valid date'),
  body('notes').optional({ nullable: true }).isString(),
  // Ownership of the linked job is verified in the controller; here we only
  // check it's a UUID shape (or explicitly null to unlink).
  body('job_id').optional({ nullable: true }).isUUID().withMessage('job_id must be a valid id'),
];

const createRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  ...optionalFieldRules,
];

const updateRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').isLength({ max: 120 }),
  ...optionalFieldRules,
];

router.get('/', [
  query('status').optional().isIn(STATUSES),
  query('job_id').optional().isUUID(),
  query('search').optional().isString().isLength({ max: 120 }),
], validate, getContacts);
router.get('/:id', [param('id').isUUID()], validate, getContactById);
router.post('/', createRules, validate, createContact);
router.put('/:id', [param('id').isUUID(), ...updateRules], validate, updateContact);
router.delete('/:id', [param('id').isUUID()], validate, deleteContact);

module.exports = router;
