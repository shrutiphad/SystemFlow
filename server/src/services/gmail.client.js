const { google } = require('googleapis');
const { GmailConnection } = require('../models');
const { encrypt, decrypt } = require('../utils/crypto.util');

// Read-only scope only - least privilege. This app never sends, deletes, or
// modifies mail; it only searches and reads snippets.
const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/integrations/gmail/callback'
  );
}

// Step 1 of OAuth: build the URL we send the user to on Google's consent screen.
// `state` carries a signed value so the callback can tie the response back to
// the right user (set by the controller).
function buildConsentUrl(state) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // needed to receive a refresh_token
    prompt: 'consent', // force refresh_token issuance on re-connect
    scope: GMAIL_SCOPES,
    state,
  });
}

// Step 2: exchange the authorization code Google redirected back with for tokens.
async function exchangeCodeForTokens(code) {
  const client = getOAuthClient();
  const { tokens } = client.getToken ? await client.getToken(code) : {};
  return tokens; // { access_token, refresh_token, expiry_date, ... }
}

// Persist (encrypted) tokens for a user, upserting the single connection row.
async function saveConnection(userId, tokens, emailAddress) {
  const values = {
    user_id: userId,
    email_address: emailAddress || null,
    access_token_enc: encrypt(tokens.access_token),
    refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
    token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    connected_at: new Date(),
  };

  const existing = await GmailConnection.findOne({ where: { user_id: userId } });
  if (existing) {
    // On reconnect Google may omit refresh_token - keep the old one if so.
    if (!values.refresh_token_enc) delete values.refresh_token_enc;
    await existing.update(values);
    return existing;
  }
  return GmailConnection.create(values);
}

// Build an authenticated Gmail API client for a given user, refreshing the
// access token transparently if it has expired.
async function getGmailForUser(userId) {
  const conn = await GmailConnection.findOne({ where: { user_id: userId } });
  if (!conn) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: decrypt(conn.access_token_enc),
    refresh_token: conn.refresh_token_enc ? decrypt(conn.refresh_token_enc) : undefined,
    expiry_date: conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
  });

  // The googleapis client auto-refreshes when it can. Capture any refreshed
  // token so we persist the new value rather than refreshing on every call.
  client.on('tokens', async (tokens) => {
    try {
      const update = {};
      if (tokens.access_token) update.access_token_enc = encrypt(tokens.access_token);
      if (tokens.refresh_token) update.refresh_token_enc = encrypt(tokens.refresh_token);
      if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date);
      if (Object.keys(update).length) await conn.update(update);
    } catch (e) {
      // Non-fatal: a failed persist just means we refresh again next time.
      console.error('Failed to persist refreshed Gmail token:', e.message);
    }
  });

  return google.gmail({ version: 'v1', auth: client });
}

// The actual search used by the chat tool. Takes a Gmail search query string
// (the LLM constructs this using real Gmail operators, e.g.
// "to:stripe.com after:2026/07/01") and returns lightweight metadata +
// snippet for the top matches. Never returns full bodies.
async function searchMessages(userId, gmailQuery, maxResults = 10) {
  const gmail = await getGmailForUser(userId);
  if (!gmail) return { connected: false, messages: [] };

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: gmailQuery,
    maxResults,
  });

  const ids = (list.data.messages || []).map((m) => m.id);
  const messages = [];

  for (const id of ids) {
    const msg = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Subject', 'Date'],
    });
    const headers = {};
    (msg.data.payload?.headers || []).forEach((h) => {
      headers[h.name.toLowerCase()] = h.value;
    });
    messages.push({
      id,
      from: headers.from || null,
      to: headers.to || null,
      subject: headers.subject || null,
      date: headers.date || null,
      snippet: msg.data.snippet || null,
    });
  }

  return { connected: true, messages };
}

async function getConnectionStatus(userId) {
  const conn = await GmailConnection.findOne({ where: { user_id: userId } });
  if (!conn) return { connected: false };
  return { connected: true, email_address: conn.email_address, connected_at: conn.connected_at };
}

async function disconnect(userId) {
  await GmailConnection.destroy({ where: { user_id: userId } });
  return { connected: false };
}

module.exports = {
  GMAIL_SCOPES,
  getOAuthClient,
  buildConsentUrl,
  exchangeCodeForTokens,
  saveConnection,
  getGmailForUser,
  searchMessages,
  getConnectionStatus,
  disconnect,
};
