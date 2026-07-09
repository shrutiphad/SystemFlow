const jwt = require('jsonwebtoken');
const { google } = require('googleapis');
const asyncHandler = require('../utils/asyncHandler');
const gmailService = require('../services/gmail.client');

// GET /api/integrations/gmail/status
const status = asyncHandler(async (req, res) => {
  res.status(200).json(await gmailService.getConnectionStatus(req.user.id));
});

// GET /api/integrations/gmail/connect
// Returns the Google consent URL. We embed a short-lived signed `state` token
// carrying the user id, so the callback (which arrives with no auth header,
// since it's a browser redirect from Google) can be tied back to this user
// and can't be forged - this is also the CSRF protection for the OAuth flow.
const connect = asyncHandler(async (req, res) => {
  const state = jwt.sign({ sub: req.user.id, purpose: 'gmail_oauth' }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
  const url = gmailService.buildConsentUrl(state);
  res.status(200).json({ url });
});

// GET /api/integrations/gmail/callback?code=...&state=...
// Google redirects the browser here after consent. No auth header is present;
// we authenticate via the signed `state` instead.
const callback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const clientRedirect = process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173';

  if (error) {
    return res.redirect(`${clientRedirect}/dashboard?gmail=denied`);
  }
  if (!code || !state) {
    return res.redirect(`${clientRedirect}/dashboard?gmail=error`);
  }

  let userId;
  try {
    const payload = jwt.verify(state, process.env.JWT_SECRET);
    if (payload.purpose !== 'gmail_oauth') throw new Error('bad purpose');
    userId = payload.sub;
  } catch {
    return res.redirect(`${clientRedirect}/dashboard?gmail=error`);
  }

  const tokens = await gmailService.exchangeCodeForTokens(code);
  if (!tokens?.access_token) {
    return res.redirect(`${clientRedirect}/dashboard?gmail=error`);
  }

  // Fetch the connected address for display.
  let emailAddress = null;
  try {
    const oauth = gmailService.getOAuthClient();
    oauth.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    emailAddress = profile.data.emailAddress || null;
  } catch {
    // Non-fatal; we can connect without knowing the address.
  }

  await gmailService.saveConnection(userId, tokens, emailAddress);
  res.redirect(`${clientRedirect}/dashboard?gmail=connected`);
});

// DELETE /api/integrations/gmail
const disconnect = asyncHandler(async (req, res) => {
  res.status(200).json(await gmailService.disconnect(req.user.id));
});

module.exports = { status, connect, callback, disconnect };
