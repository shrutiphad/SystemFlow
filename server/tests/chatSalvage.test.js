const { parseFailedToolCalls, isToolFormatError } = require('../src/controllers/chat.controller');

// Pure-logic tests for the recovery path that rescues a chat answer when
// llama-3.3 on Groq emits a malformed tool call (400 tool_use_failed). No DB or
// Groq needed - this is exactly the kind of failure that's otherwise impossible
// to reproduce on demand, so it's worth pinning down here.

describe('chat tool-call salvage', () => {
  it('recognises a Groq tool_use_failed error', () => {
    expect(isToolFormatError({ status: 400, error: { code: 'tool_use_failed' } })).toBe(true);
    expect(isToolFormatError({ status: 400, message: 'tool_use_failed happened' })).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isToolFormatError({ status: 429, error: { code: 'rate_limit_exceeded' } })).toBe(false);
    expect(isToolFormatError({ status: 500 })).toBe(false);
    expect(isToolFormatError(null)).toBe(false);
  });

  it('recovers a call from the "<function=name {..} </function>" shape', () => {
    const err = {
      status: 400,
      error: {
        code: 'tool_use_failed',
        failed_generation:
          '<function=queryJobApplications {"stage": "oa", "onDate": "2026-07-10"} </function>',
      },
    };
    const calls = parseFailedToolCalls(err);
    expect(calls).toHaveLength(1);
    expect(calls[0].function.name).toBe('queryJobApplications');
    expect(JSON.parse(calls[0].function.arguments)).toEqual({ stage: 'oa', onDate: '2026-07-10' });
  });

  it('recovers the "<function=name>{..}</function>" shape', () => {
    const err = {
      status: 400,
      error: {
        code: 'tool_use_failed',
        failed_generation: '<function=searchJobsByCompany>{"companyName":"MayFair"}</function>',
      },
    };
    const calls = parseFailedToolCalls(err);
    expect(calls[0].function.name).toBe('searchJobsByCompany');
    expect(JSON.parse(calls[0].function.arguments)).toEqual({ companyName: 'MayFair' });
  });

  it('recovers a no-closing-tag, empty-args call', () => {
    const err = {
      status: 400,
      error: { code: 'tool_use_failed', failed_generation: '<function=getJobCountsByStatus>{}' },
    };
    const calls = parseFailedToolCalls(err);
    expect(calls[0].function.name).toBe('getJobCountsByStatus');
    expect(JSON.parse(calls[0].function.arguments)).toEqual({});
  });

  it('returns null when there is nothing to salvage', () => {
    expect(parseFailedToolCalls({ status: 400, error: {} })).toBeNull();
    expect(parseFailedToolCalls({ status: 400, error: { failed_generation: 'just prose, no call' } })).toBeNull();
  });
});
