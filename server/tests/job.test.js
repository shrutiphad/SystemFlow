const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

describe('Job Application API', () => {
  const user = { name: 'Job Tester', email: 'jest.jobs@example.com', password: 'Password1' };
  const other = { name: 'Other', email: 'jest.jobs.other@example.com', password: 'Password1' };
  let token, otherToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    token = (await request(app).post('/api/auth/register').send(user)).body.token;
    otherToken = (await request(app).post('/api/auth/register').send(other)).body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(401);
  });

  it('creates a job application', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Stripe', role_title: 'Backend Engineer', status: 'applied' });
    expect(res.status).toBe(201);
    expect(res.body.job.company_name).toBe('Stripe');
    expect(res.body.job.status).toBe('applied');
  });

  it('rejects a job with no company name', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ role_title: 'x' });
    expect(res.status).toBe(400);
  });

  it('creates a job with the extended fields and persists them', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        company_name: 'Vercel',
        role_title: 'Platform Engineer',
        job_url: 'https://vercel.com/careers/platform-engineer',
        location: 'Remote',
        salary_range: '20-30 LPA',
        source: 'company_site',
        excitement: 4,
      });
    expect(res.status).toBe(201);
    expect(res.body.job.job_url).toBe('https://vercel.com/careers/platform-engineer');
    expect(res.body.job.location).toBe('Remote');
    expect(res.body.job.salary_range).toBe('20-30 LPA');
    expect(res.body.job.source).toBe('company_site');
    expect(res.body.job.excitement).toBe(4);

    // Re-fetch to prove the values hit the database, not just the response.
    const fetched = await request(app)
      .get(`/api/jobs/${res.body.job.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(fetched.body.job.excitement).toBe(4);
    expect(fetched.body.job.source).toBe('company_site');
  });

  it('updates the extended fields via PUT', async () => {
    const created = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'UpdateMe' });
    const res = await request(app)
      .put(`/api/jobs/${created.body.job.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ excitement: 5, source: 'referral', location: 'Pune' });
    expect(res.status).toBe(200);
    expect(res.body.job.excitement).toBe(5);
    expect(res.body.job.source).toBe('referral');
    expect(res.body.job.location).toBe('Pune');
  });

  it('rejects an out-of-range excitement rating', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'X Corp', excitement: 9 });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid source bucket', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'X Corp', source: 'carrier_pigeon' });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed job_url', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'X Corp', job_url: 'not a url at all' });
    expect(res.status).toBe(400);
  });

  it('moves a job to a new status via PATCH', async () => {
    const list = await request(app).get('/api/jobs').set('Authorization', `Bearer ${token}`);
    const id = list.body.jobs[0].id;
    const res = await request(app)
      .patch(`/api/jobs/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'interviewing' });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe('interviewing');
  });

  it('rejects an invalid status on PATCH', async () => {
    const list = await request(app).get('/api/jobs').set('Authorization', `Bearer ${token}`);
    const id = list.body.jobs[0].id;
    const res = await request(app)
      .patch(`/api/jobs/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'not_a_real_status' });
    expect(res.status).toBe(400);
  });

  it("does not let a user see another user's application", async () => {
    const list = await request(app).get('/api/jobs').set('Authorization', `Bearer ${token}`);
    const id = list.body.jobs[0].id;
    const res = await request(app).get(`/api/jobs/${id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('deletes a job application', async () => {
    const list = await request(app).get('/api/jobs').set('Authorization', `Bearer ${token}`);
    const id = list.body.jobs[0].id;
    const res = await request(app).delete(`/api/jobs/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
