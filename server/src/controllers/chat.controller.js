const { getGroq, CHAT_MODEL } = require('../services/groq.client');
const { TOOL_DEFINITIONS, TOOL_IMPLEMENTATIONS } = require('../services/chatTools');
const asyncHandler = require('../utils/asyncHandler');

// Built per request (not a module const) so "today" is always the real current
// date - date reasoning like "10th July" -> 2026-07-10 depends on it.
function buildSystemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return `You are the SystemFlow assistant, embedded in a product that manages the user's
TASKS, their JOB APPLICATIONS (a Kanban pipeline), and - if connected - their GMAIL.

Answer ONLY from tool results; never invent data. If a tool returns nothing, say so
specifically (e.g. "You have no online assessments scheduled for 10 Jul.").

Job pipeline stages and what users call them:
- wishlist     - saved / interested
- applied      - applied / submitted
- oa           - ONLINE ASSESSMENT, OA, coding test, take-home, "assessment"
- interviewing - interview, interview round, phone screen, onsite
- offer        - offer received
- rejected     - rejected / closed
- withdrawn    - withdrawn

Which tool to use:
- "online assessment(s)", "OA", "test", "assessment" -> queryJobApplications with stage 'oa'.
- "interview(s)" -> queryJobApplications with stage 'interviewing'.
- Any question that pairs a stage with a day/week/date -> queryJobApplications with that
  stage plus onDate (single day) or fromDate/toDate (a range).
- "who do I need to follow up with / chase" -> getJobsNeedingFollowUp.
- A specific company's application status -> searchJobsByCompany.
- Pipeline counts / overview -> getJobCountsByStatus.
- Task deadlines / what's overdue or due soon -> getOverdueOrUpcomingTasks.
- A specific task -> searchTasksByCompany. Task counts -> getTaskCountsByStatus.
- The user's actual email -> searchGmail (if not connected, tell them to connect Gmail).

Dates: today is ${today}. Resolve relative dates ("tomorrow", "this week", "10th July")
to concrete YYYY-MM-DD before calling a tool, assuming the current year unless told
otherwise. When you list applications, name the company and the relevant date.
Keep answers short and direct, 1-3 sentences.`;
}

// The tool-calling loop:
//  1. send the user's message + tool definitions to Groq
//  2. if Groq's response contains tool_calls, run the REAL function
//     (scoped to req.user.id, never trusting anything the model supplies)
//  3. send the tool result back to Groq as a new message
//  4. Groq returns a final natural-language answer
// A max round count guards against a pathological infinite tool-call loop.
const MAX_TOOL_ROUNDS = 4;

// llama-3.3 on Groq intermittently emits a MALFORMED tool call (wrapping it in
// "<function=...>" text instead of valid JSON), which Groq rejects with a 400
// `tool_use_failed`. It's a stochastic formatting slip, not a real error. We
// handle it in two layers: retry the completion a few times, and - crucially -
// if it keeps failing, recover the model's INTENDED call from the error's
// `failed_generation` payload and run it directly. That salvages the user's
// actual answer instead of re-rolling forever.
function isToolFormatError(err) {
  const code = err?.error?.code || err?.code;
  return err?.status === 400 && (code === 'tool_use_failed' || /tool_use_failed/.test(err?.message || ''));
}

// Pull the intended tool call(s) out of a `tool_use_failed` error. Groq echoes
// what the model tried to emit in `failed_generation`, e.g.
//   <function=queryJobApplications {"stage":"oa","onDate":"2026-07-10"} </function>
function parseFailedToolCalls(err) {
  const raw = err?.error?.failed_generation || err?.failed_generation;
  if (!raw || typeof raw !== 'string') return null;
  const calls = [];
  // Tolerant of the several malformed shapes llama emits:
  //   <function=name {..}</function>, <function=name>{..}</function>,
  //   <function=name>{..} (no closing tag). Grabs the name then the first
  //   {...} object (our tool args are flat, so the first object is the whole
  //   argument set).
  const re = /<function=([a-zA-Z0-9_]+)\s*>?\s*(\{[\s\S]*?\})/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    calls.push({
      id: `salvaged_${calls.length}`,
      type: 'function',
      function: { name: m[1], arguments: m[2] },
    });
  }
  return calls.length ? calls : null;
}

// One blind retry only: a cheap re-roll fixes many format slips, and anything
// still broken is recovered by parseFailedToolCalls without spending more input
// tokens. Kept low deliberately - each retry re-sends the full tool schema.
async function completionWithToolRetry(groq, params, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await groq.chat.completions.create(params);
    } catch (err) {
      lastErr = err;
      if (!isToolFormatError(err)) throw err; // a genuine error - don't mask it
    }
  }
  throw lastErr;
}

// Runs one model-requested tool. `userId` is injected here from the
// authenticated request - it is never part of the model-supplied args, and the
// model never had userId available to it in the first place.
async function runToolCall(call, userId) {
  const impl = TOOL_IMPLEMENTATIONS[call.function.name];
  if (!impl) return { error: `Unknown tool: ${call.function.name}` };
  let args = {};
  try {
    args = JSON.parse(call.function.arguments || '{}');
  } catch {
    args = {};
  }
  return impl(userId, args);
}

const sendMessage = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  const userId = req.user.id;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'A non-empty "message" string is required' });
  }

  // Resolve the Groq client here. If GROQ_API_KEY isn't configured, this
  // throws a 503-flagged error that the error middleware turns into a clean
  // "chat not configured" response - the rest of the app is unaffected.
  let groq;
  try {
    groq = getGroq();
  } catch (err) {
    return res.status(err.status || 503).json({
      message: err.userMessage || 'The chat assistant is not available right now.',
    });
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    // history is prior turns from this session, sent by the client -
    // it's only ever echoed back to Groq for conversational context,
    // never trusted as a source of task data.
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  let round = 0;
  let finalAnswer = null;

  while (round < MAX_TOOL_ROUNDS && finalAnswer === null) {
    round += 1;

    let toolCalls;
    try {
      const completion = await completionWithToolRetry(groq, {
        model: CHAT_MODEL,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.2,
      });
      const choice = completion.choices[0].message;
      messages.push(choice);

      if (!choice.tool_calls || choice.tool_calls.length === 0) {
        finalAnswer = choice.content;
        break;
      }
      toolCalls = choice.tool_calls;
    } catch (err) {
      // Groq daily/token rate limit - surface a clean, honest message instead
      // of a raw provider error. The rest of the app is unaffected.
      if (err?.status === 429) {
        return res.status(429).json({
          message: 'The assistant has hit its usage limit for now. Please try again in a few minutes.',
        });
      }
      if (!isToolFormatError(err)) throw err;
      // Retries still couldn't get valid JSON out of the model - recover the
      // call it MEANT to make from the error payload and run it directly.
      toolCalls = parseFailedToolCalls(err);
      if (!toolCalls) {
        finalAnswer = "I couldn't work that out just now — try rephrasing your question.";
        break;
      }
      // Keep the conversation well-formed: a tool result must follow an
      // assistant message that declared the matching tool_call id.
      messages.push({ role: 'assistant', content: null, tool_calls: toolCalls });
    }

    for (const call of toolCalls) {
      const result = await runToolCall(call, userId);
      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  if (finalAnswer === null) {
    finalAnswer = "I wasn't able to work that out in a reasonable number of steps - try rephrasing your question.";
  }

  res.status(200).json({ reply: finalAnswer });
});

// Helpers exported for unit testing the malformed-tool-call recovery, which
// otherwise only triggers on a stochastic LLM failure that's hard to reproduce.
module.exports = { sendMessage, parseFailedToolCalls, isToolFormatError };
