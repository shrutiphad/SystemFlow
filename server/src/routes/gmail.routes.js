const express = require('express');
const requireAuth = require('../middleware/auth.middleware');
const { status, connect, callback, disconnect } = require('../controllers/gmail.controller');

const router = express.Router();

// The callback is hit by Google's browser redirect and authenticates via the
// signed `state` param, so it must NOT require the Authorization header.
router.get('/callback', callback);

// Everything else is a normal authenticated API call from our own frontend.
router.get('/status', requireAuth, status);
router.get('/connect', requireAuth, connect);
router.delete('/', requireAuth, disconnect);

module.exports = router;
