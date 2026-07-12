const { Op } = require('sequelize');
const { Contact, JobApplication } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

// When a contact is linked to a job (job_id), the parent job MUST belong to the
// same user - otherwise user A could attach their contact to user B's job and
// leak its existence. Returns true if job_id is absent/null (nothing to check)
// or the job is owned by userId; false if it points at a missing/foreign job.
async function jobIsReachable(jobId, userId) {
  if (jobId === undefined || jobId === null || jobId === '') return true;
  const job = await JobApplication.findOne({ where: { id: jobId, user_id: userId } });
  return Boolean(job);
}

// The linked-job shape returned alongside a contact, so the card can show
// "for the Stripe / Backend Engineer application" without a second request.
const jobInclude = {
  model: JobApplication,
  as: 'job',
  attributes: ['id', 'company_name', 'role_title', 'status'],
};

// GET /api/contacts  -> the user's network, newest first.
// Optional ?status=, ?job_id=, and ?search= (name or company, case-insensitive).
const getContacts = asyncHandler(async (req, res) => {
  const { status, job_id, search } = req.query;
  const where = { user_id: req.user.id };
  if (status) where.status = status;
  if (job_id) where.job_id = job_id;
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { company_name: { [Op.iLike]: `%${search}%` } },
    ];
  }

  const contacts = await Contact.findAll({
    where,
    include: [jobInclude],
    order: [['created_at', 'DESC']],
  });
  res.status(200).json({ contacts, count: contacts.length });
});

const getContactById = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({
    where: { id: req.params.id, user_id: req.user.id },
    include: [jobInclude],
  });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  res.status(200).json({ contact });
});

// Shared by create and update so they can never drift apart when a column is added.
const WRITABLE_FIELDS = [
  'name', 'role_title', 'company_name', 'email', 'phone', 'linkedin_url',
  'relationship', 'status', 'last_contacted', 'next_follow_up', 'notes', 'job_id',
];

const createContact = asyncHandler(async (req, res) => {
  if (!(await jobIsReachable(req.body.job_id, req.user.id))) {
    return res.status(400).json({ message: 'Linked application not found' });
  }

  const values = {};
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) values[f] = req.body[f];
  }
  const created = await Contact.create({
    ...values,
    user_id: req.user.id, // ownership from the token, never the body
  });

  const contact = await Contact.findByPk(created.id, { include: [jobInclude] });
  res.status(201).json({ contact });
});

const updateContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });

  if (req.body.job_id !== undefined && !(await jobIsReachable(req.body.job_id, req.user.id))) {
    return res.status(400).json({ message: 'Linked application not found' });
  }

  const updates = {};
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  await contact.update(updates);

  const fresh = await Contact.findByPk(contact.id, { include: [jobInclude] });
  res.status(200).json({ contact: fresh });
});

const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!contact) return res.status(404).json({ message: 'Contact not found' });
  await contact.destroy();
  res.status(200).json({ message: 'Contact deleted', id: req.params.id });
});

module.exports = { getContacts, getContactById, createContact, updateContact, deleteContact };
