require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Task } = require('../src/models');

const DEMO_EMAIL = 'demo@systemflow.dev';
const DEMO_PASSWORD = 'Demo1234';

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  let user = await User.findOne({ where: { email: DEMO_EMAIL } });
  if (!user) {
    const password_hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    user = await User.create({ name: 'Demo User', email: DEMO_EMAIL, password_hash });
    console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log('Demo user already exists, reusing it.');
  }

  const existingTaskCount = await Task.count({ where: { user_id: user.id } });
  if (existingTaskCount > 0) {
    console.log(`Demo user already has ${existingTaskCount} tasks, skipping task seed.`);
    await sequelize.close();
    return;
  }

  const today = new Date();
  const daysFromNow = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const tasks = [
    { title: 'Finalise onboarding flow copy', description: 'Tighten up empty-state and error messages.', priority: 'high', status: 'in_progress', due_date: daysFromNow(-2) },
    { title: 'Fix flaky Cypress test on login', description: 'Race condition between token write and redirect.', priority: 'high', status: 'todo', due_date: daysFromNow(1) },
    { title: 'Review PR #142', description: 'Sequelize migration for the new indexes.', priority: 'medium', status: 'todo', due_date: daysFromNow(3) },
    { title: 'Write ARCHITECTURE.md', description: 'Document schema and auth flow trade-offs.', priority: 'medium', status: 'done', due_date: daysFromNow(-5) },
    { title: 'Set up CI pipeline', description: 'GitHub Actions: lint, test, build.', priority: 'low', status: 'todo', due_date: daysFromNow(10) },
    { title: 'Dark mode polish pass', description: 'Check contrast on priority badges.', priority: 'low', status: 'in_progress', due_date: daysFromNow(5) },
    { title: 'Deploy backend to Render', description: 'Point env vars at managed Postgres instance.', priority: 'high', status: 'done', due_date: daysFromNow(-1) },
    { title: 'Client demo walkthrough', description: 'Record a 2-minute Loom for the README.', priority: 'medium', status: 'todo', due_date: daysFromNow(2) },
  ];

  await Task.bulkCreate(tasks.map((t) => ({ ...t, user_id: user.id })));
  console.log(`Seeded ${tasks.length} tasks for ${DEMO_EMAIL}.`);
  await sequelize.close();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
