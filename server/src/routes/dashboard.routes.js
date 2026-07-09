const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { getSummary } = require('../controllers/dashboard.controller');

const router = express.Router();
router.get('/summary', requireAuth, getSummary);

module.exports = router;
