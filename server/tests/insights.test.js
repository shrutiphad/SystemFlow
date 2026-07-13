const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

describe('Insights API', () => {
  const user = { name: 'Insights Tester', email: 'jest.insights@example.com', password: 'Password1' };
  const other = { name: 'Other Insights', email: 'jest.insights.other@example.com', password: 'Password1' };
  let token, otherToken;

  const auth = (t) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    token = (await request(app).post('/api/auth/register').send(user)).body.token;
    otherToken = (await request(app).post('/api/auth/register').send(other)).body.token;

    // Seed user A: 3 applications across stages, 1 contact, 1 task.
    await request(app).post('/api/jobs').set(auth(token)).send({ company_name: 'Stripe', status: 'applied', source: 'linkedin' });
    await request(app).post('/api/jobs').set(auth(token)).send({ company_name: 'Vercel', status: 'interviewing', source: 'referral' });
    await request(app).post('/api/jobs').set(auth(token)).send({ company_name: 'Figma', status: 'offer', source: 'referral' });
    await request(app).post('/api/contacts').set(auth(token)).send({ name: 'Recruiter A', status: 'contacted' });
    await request(app).post('/api/tasks').set(auth(token)).send({ title: 'Prep DSA', status: 'todo' });

    // Seed user B: 1 application, so we can prove isolation.
    await request(app).post('/api/jobs').set(auth(otherToken)).send({ company_name: 'Netflix', status: 'applied' });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/insights');
    expect(res.status).toBe(401);
  });

  it('returns aggregated counts for the authenticated user only', async () => {
    const res = await request(app).get('/api/insights').set(auth(token));
    expect(res.status).toBe(200);

    // Totals reflect only user A's data (3 apps, not 4).
    expect(res.body.totals.applications).toBe(3);
    expect(res.body.totals.contacts).toBe(1);
    expect(res.body.totals.tasks).toBe(1);
    expect(res.body.totals.offers).toBe(1);

    // Grouped funnel is zero-filled across every stage.
    expect(res.body.jobsByStatus.applied).toBe(1);
    expect(res.body.jobsByStatus.interviewing).toBe(1);
    expect(res.body.jobsByStatus.offer).toBe(1);
    expect(res.body.jobsByStatus.wishlist).toBe(0);

    // Source breakdown grouped in SQL.
    expect(res.body.jobsBySource.referral).toBe(2);
    expect(res.body.jobsBySource.linkedin).toBe(1);

    // Contacts + tasks grouped.
    expect(res.body.contactsByStatus.contacted).toBe(1);
    expect(res.body.tasksByStatus.todo).toBe(1);

    // Over-time trend is present as an array of {month, count}.
    expect(Array.isArray(res.body.applicationsOverTime)).toBe(true);
    const totalOverTime = res.body.applicationsOverTime.reduce((s, r) => s + r.count, 0);
    expect(totalOverTime).toBe(3);
  });

  it("does not leak another user's data into insights", async () => {
    const res = await request(app).get('/api/insights').set(auth(otherToken));
    expect(res.status).toBe(200);
    // User B has exactly 1 application and 0 contacts/tasks.
    expect(res.body.totals.applications).toBe(1);
    expect(res.body.totals.contacts).toBe(0);
    expect(res.body.totals.tasks).toBe(0);
    expect(res.body.jobsByStatus.applied).toBe(1);
    expect(res.body.jobsByStatus.offer).toBe(0);
  });

  it('computes a response rate from the aggregates', async () => {
    const res = await request(app).get('/api/insights').set(auth(token));
    // submitted = 3 (none in wishlist); advanced = oa+interviewing+offer = 2.
    // responseRate = round(2/3 * 100) = 67.
    expect(res.body.totals.responseRate).toBe(67);
  });
});
