const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

describe('Contacts (Network) API', () => {
  const user = { name: 'Net Tester', email: 'jest.contacts@example.com', password: 'Password1' };
  const other = { name: 'Other Net', email: 'jest.contacts.other@example.com', password: 'Password1' };
  let token, otherToken;
  let myJobId, otherJobId;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    token = (await request(app).post('/api/auth/register').send(user)).body.token;
    otherToken = (await request(app).post('/api/auth/register').send(other)).body.token;

    // A job owned by each user, to exercise the parent-ownership rule.
    myJobId = (await request(app).post('/api/jobs').set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Stripe', status: 'applied' })).body.job.id;
    otherJobId = (await request(app).post('/api/jobs').set('Authorization', `Bearer ${otherToken}`)
      .send({ company_name: 'Netflix', status: 'applied' })).body.job.id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/contacts');
    expect(res.status).toBe(401);
  });

  it('creates a contact', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Priya Recruiter', company_name: 'Stripe', relationship: 'recruiter', status: 'contacted', email: 'priya@stripe.com' });
    expect(res.status).toBe(201);
    expect(res.body.contact.name).toBe('Priya Recruiter');
    expect(res.body.contact.relationship).toBe('recruiter');
    expect(res.body.contact.status).toBe('contacted');
  });

  it('requires a name', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'Stripe' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Email', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid relationship', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Rel', relationship: 'carrier_pigeon' });
    expect(res.status).toBe(400);
  });

  it('links a contact to the user\'s own job and returns the joined job', async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Linked Person', job_id: myJobId });
    expect(res.status).toBe(201);
    expect(res.body.contact.job_id).toBe(myJobId);
    expect(res.body.contact.job.company_name).toBe('Stripe');
  });

  it("refuses to link a contact to another user's job (parent-ownership rule)", async () => {
    const res = await request(app)
      .post('/api/contacts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Sneaky Link', job_id: otherJobId });
    expect(res.status).toBe(400);
  });

  it('filters contacts by status', async () => {
    const res = await request(app)
      .get('/api/contacts?status=contacted')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.contacts.every((c) => c.status === 'contacted')).toBe(true);
  });

  it('updates a contact', async () => {
    const created = await request(app).post('/api/contacts').set('Authorization', `Bearer ${token}`)
      .send({ name: 'To Update' });
    const res = await request(app)
      .put(`/api/contacts/${created.body.contact.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'referred', relationship: 'referral' });
    expect(res.status).toBe(200);
    expect(res.body.contact.status).toBe('referred');
    expect(res.body.contact.relationship).toBe('referral');
  });

  it("does not let a user see another user's contact", async () => {
    const list = await request(app).get('/api/contacts').set('Authorization', `Bearer ${token}`);
    const id = list.body.contacts[0].id;
    const res = await request(app).get(`/api/contacts/${id}`).set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it("does not let a user update another user's contact", async () => {
    const list = await request(app).get('/api/contacts').set('Authorization', `Bearer ${token}`);
    const id = list.body.contacts[0].id;
    const res = await request(app)
      .put(`/api/contacts/${id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hacked' });
    expect(res.status).toBe(404);
  });

  it('deletes a contact', async () => {
    const list = await request(app).get('/api/contacts').set('Authorization', `Bearer ${token}`);
    const id = list.body.contacts[0].id;
    const res = await request(app).delete(`/api/contacts/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
