const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { getInsights } = require('../controllers/insights.controller');

const router = express.Router();
router.get('/', requireAuth, getInsights);

module.exports = router;
