const bcrypt = require('bcryptjs');
const { sequelize, User, Contact } = require('../src/models');
const { TOOL_IMPLEMENTATIONS, TOOL_DEFINITIONS } = require('../src/services/chatTools');

// These exercise the chat tools DIRECTLY (the way the chat controller runs them:
// tool(userId, args)), proving the scoping guarantee without an LLM. The key
// property: a tool called with user A's id can never surface user B's contacts,
// and no tool schema exposes a userId parameter for the model to abuse.

describe('Chat contact tools', () => {
  let userA, userB;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const hash = await bcrypt.hash('Password1', 10);
    userA = await User.create({ name: 'User A', email: 'chat.a@example.com', password_hash: hash });
    userB = await User.create({ name: 'User B', email: 'chat.b@example.com', password_hash: hash });

    const today = new Date().toISOString().slice(0, 10);
    await Contact.create({ user_id: userA.id, name: 'Priya Sharma', company_name: 'Stripe', status: 'contacted', next_follow_up: today });
    await Contact.create({ user_id: userA.id, name: 'Raj Gupta', company_name: 'Vercel', status: 'referred' });
    // User B has a Stripe contact too - it must never leak into A's results.
    await Contact.create({ user_id: userB.id, name: 'Someone Else', company_name: 'Stripe', status: 'contacted' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('exposes no userId parameter in any tool schema', () => {
    for (const def of TOOL_DEFINITIONS) {
      const props = def.function.parameters.properties || {};
      expect(Object.keys(props)).not.toContain('userId');
      expect(Object.keys(props)).not.toContain('user_id');
    }
  });

  it('searchContactsByName finds the user\'s own contact', async () => {
    const res = await TOOL_IMPLEMENTATIONS.searchContactsByName(userA.id, { query: 'Stripe' });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Priya Sharma');
    expect(res[0].status_label).toBe('Contacted');
  });

  it("does not surface another user's contact with the same company", async () => {
    const res = await TOOL_IMPLEMENTATIONS.searchContactsByName(userB.id, { query: 'Stripe' });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe('Someone Else'); // B sees only B's own
  });

  it('getContactCountsByStatus is scoped and zero-filled', async () => {
    const a = await TOOL_IMPLEMENTATIONS.getContactCountsByStatus(userA.id);
    expect(a).toEqual({ to_contact: 0, contacted: 1, responded: 0, referred: 1, closed: 0 });
    const b = await TOOL_IMPLEMENTATIONS.getContactCountsByStatus(userB.id);
    expect(b.contacted).toBe(1);
    expect(b.referred).toBe(0);
  });

  it('getContactsNeedingFollowUp returns due contacts for the right user only', async () => {
    const a = await TOOL_IMPLEMENTATIONS.getContactsNeedingFollowUp(userA.id, { withinDays: 7 });
    expect(a.map((c) => c.name)).toContain('Priya Sharma');
    const b = await TOOL_IMPLEMENTATIONS.getContactsNeedingFollowUp(userB.id, { withinDays: 7 });
    expect(b).toHaveLength(0); // B's contact has no follow-up date
  });
});
