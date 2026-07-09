const { JobApplication } = require('../models');
const asyncHandler = require('../utils/asyncHandler');

const VALID_STATUSES = ['wishlist', 'applied', 'oa', 'interviewing', 'offer', 'rejected', 'withdrawn'];

// GET /api/jobs  -> all of the user's applications (the Kanban board groups
// these client-side by status). Optional ?status= filter for completeness.
const getJobs = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = { user_id: req.user.id };
  if (status) where.status = status;

  const jobs = await JobApplication.findAll({
    where,
    order: [['created_at', 'DESC']],
  });
  res.status(200).json({ jobs, count: jobs.length });
});

const getJobById = asyncHandler(async (req, res) => {
  const job = await JobApplication.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!job) return res.status(404).json({ message: 'Application not found' });
  res.status(200).json({ job });
});

// Every writable field on an application. Shared by create and update so the
// two can never drift apart when a column is added.
const WRITABLE_FIELDS = [
  'company_name', 'role_title', 'portal', 'job_url', 'location', 'salary_range',
  'source', 'excitement', 'status', 'outreach_sent', 'applied_date', 'next_follow_up', 'notes',
];

const createJob = asyncHandler(async (req, res) => {
  const values = {};
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) values[f] = req.body[f];
  }
  const job = await JobApplication.create({
    ...values,
    user_id: req.user.id, // ownership from the token, never the body - same as tasks
  });
  res.status(201).json({ job });
});

const updateJob = asyncHandler(async (req, res) => {
  const job = await JobApplication.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!job) return res.status(404).json({ message: 'Application not found' });

  const updates = {};
  for (const f of WRITABLE_FIELDS) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }
  await job.update(updates);
  res.status(200).json({ job });
});

// PATCH /api/jobs/:id/status -> dedicated lightweight endpoint for Kanban
// drag-and-drop. A drag only ever changes status, so this avoids sending the
// whole record back on every drop. Semantically cleaner than reusing PUT.
const updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const job = await JobApplication.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!job) return res.status(404).json({ message: 'Application not found' });

  await job.update({ status });
  res.status(200).json({ job });
});

const deleteJob = asyncHandler(async (req, res) => {
  const job = await JobApplication.findOne({ where: { id: req.params.id, user_id: req.user.id } });
  if (!job) return res.status(404).json({ message: 'Application not found' });
  await job.destroy();
  res.status(200).json({ message: 'Application deleted', id: req.params.id });
});

module.exports = { getJobs, getJobById, createJob, updateJob, updateJobStatus, deleteJob };
