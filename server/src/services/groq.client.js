const Groq = require('groq-sdk');

// Lazily construct the Groq client on first use, so a missing GROQ_API_KEY
// doesn't crash the whole server at import time. The task and job features
// don't need Groq at all - only the chat assistant does - so the app must
// boot fine without a key. If someone hits the chat endpoint without a key
// configured, they get a clean 503 (handled in chat.controller), not a
// process-wide crash.
let _groq = null;

function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error('GROQ_API_KEY is not configured');
    err.status = 503;
    err.userMessage = 'The chat assistant is not configured. Add GROQ_API_KEY to enable it.';
    throw err;
  }
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || undefined,
    });
  }
  return _groq;
}

// Centralising the model name here means changing models later is a
// one-line change, not a find-and-replace across the codebase.
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile';

module.exports = { getGroq, CHAT_MODEL };
