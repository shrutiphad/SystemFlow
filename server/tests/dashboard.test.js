const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

describe('Dashboard agenda API', () => {
  const user = { name: 'Agenda Tester', email: 'jest.agenda@example.com', password: 'Password1' };
  const other = { name: 'Other Agenda', email: 'jest.agenda.other@example.com', password: 'Password1' };
  let token, otherToken;
  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  const soon = () => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().slice(0, 10); };
  const past = () => { const d = new Date(); d.setDate(d.getDate() - 3); return d.toISOString().slice(0, 10); };
  const farOff = () => { const d = new Date(); d.setDate(d.getDate() + 45); return d.toISOString().slice(0, 10); };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    token = (await request(app).post('/api/auth/register').send(user)).body.token;
    otherToken = (await request(app).post('/api/auth/register').send(other)).body.token;

    // User A: a job due soon, an overdue contact, and a job far in the future
    // (should be excluded from the 7-day window), plus a closed contact (excluded).
    await request(app).post('/api/jobs').set(auth(token)).send({ company_name: 'Stripe', status: 'applied', next_follow_up: soon() });
    await request(app).post('/api/jobs').set(auth(token)).send({ company_name: 'LaterCorp', status: 'applied', next_follow_up: farOff() });
    await request(app).post('/api/contacts').set(auth(token)).send({ name: 'Priya', status: 'contacted', next_follow_up: past() });
    await request(app).post('/api/contacts').set(auth(token)).send({ name: 'Closed Person', status: 'closed', next_follow_up: soon() });

    // User B has their own due job - must never appear in A's agenda.
    await request(app).post('/api/jobs').set(auth(otherToken)).send({ company_name: 'Netflix', status: 'applied', next_follow_up: soon() });
  });

  afterAll(async () => { await sequelize.close(); });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/dashboard/agenda');
    expect(res.status).toBe(401);
  });

  it('returns follow-ups due within the window, excluding far-off and closed', async () => {
    const res = await request(app).get('/api/dashboard/agenda').set(auth(token));
    expect(res.status).toBe(200);

    const jobNames = res.body.jobs.map((j) => j.company_name);
    expect(jobNames).toContain('Stripe');
    expect(jobNames).not.toContain('LaterCorp'); // 45 days out, beyond the 7-day window

    const contactNames = res.body.contacts.map((c) => c.name);
    expect(contactNames).toContain('Priya');
    expect(contactNames).not.toContain('Closed Person'); // closed contacts excluded

    // The overdue contact is flagged as such.
    const priya = res.body.contacts.find((c) => c.name === 'Priya');
    expect(priya.overdue).toBe(true);
  });

  it("does not leak another user's follow-ups", async () => {
    const res = await request(app).get('/api/dashboard/agenda').set(auth(token));
    expect(res.body.jobs.map((j) => j.company_name)).not.toContain('Netflix');
  });

  it('honours a custom withinDays that widens the window', async () => {
    const res = await request(app).get('/api/dashboard/agenda?withinDays=60').set(auth(token));
    expect(res.body.jobs.map((j) => j.company_name)).toContain('LaterCorp');
  });
});
