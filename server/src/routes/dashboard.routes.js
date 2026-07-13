const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { getSummary, getAgenda } = require('../controllers/dashboard.controller');

const router = express.Router();
router.get('/summary', requireAuth, getSummary);
router.get('/agenda', requireAuth, getAgenda);

module.exports = router;
