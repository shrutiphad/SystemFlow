const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate.middleware');
const requireAuth = require('../middleware/auth.middleware');
const { sendMessage } = require('../controllers/chat.controller');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  [
    body('message').isString().trim().notEmpty().isLength({ max: 2000 }),
    body('history').optional().isArray(),
  ],
  validate,
  sendMessage
);

module.exports = router;
