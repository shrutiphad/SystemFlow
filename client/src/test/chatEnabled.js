// Probes the live backend once to learn whether the LLM assistant is configured
// (GROQ_API_KEY present). The chat integration tests import this and skip
// themselves when chat isn't available - so CI without a Groq key stays green
// instead of failing on assistant responses it can't produce, while a developer
// with a key in server/.env still runs them for real.
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function probe() {
  try {
    const res = await fetch(`${API}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.chat);
  } catch {
    return false;
  }
}

// Top-level await: importers get the resolved boolean, so it can drive
// `it.skipIf(...)` at collection time.
export const chatEnabled = await probe();
