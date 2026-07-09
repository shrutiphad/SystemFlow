const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

describe('Task API', () => {
  const user = { name: 'Task Tester', email: 'jest.tasks@example.com', password: 'Password1' };
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const res = await request(app).post('/api/auth/register').send(user);
    token = res.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('rejects unauthenticated task access', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('creates a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Write tests', priority: 'high', status: 'todo' });
    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Write tests');
  });

  it('rejects a task with no title', async () => {
    const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ priority: 'low' });
    expect(res.status).toBe(400);
  });

  it("lists only the current user's tasks", async () => {
    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  it('filters tasks by status', async () => {
    const res = await request(app).get('/api/tasks?status=done').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it('updates a task', async () => {
    const list = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    const id = list.body.tasks[0].id;
    const res = await request(app).put(`/api/tasks/${id}`).set('Authorization', `Bearer ${token}`).send({ status: 'done' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('done');
  });

  it('returns dashboard summary reflecting the update', async () => {
    const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.byStatus.done).toBe(1);
  });

  it('deletes a task', async () => {
    const list = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
    const id = list.body.tasks[0].id;
    const res = await request(app).delete(`/api/tasks/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 for another user's task id", async () => {
    const other = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Other', email: 'other.jest@example.com', password: 'Password1' });
    const otherTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({ title: 'Not yours' });

    const res = await request(app).get(`/api/tasks/${otherTask.body.task.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
