const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const taskRoutes = require('./routes/task.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const chatRoutes = require('./routes/chat.routes');
const jobRoutes = require('./routes/jobApplication.routes');
const contactRoutes = require('./routes/contact.routes');
const gmailRoutes = require('./routes/gmail.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  // `chat` advertises whether the LLM assistant is configured on this instance.
  // The frontend's live-LLM integration tests use it to skip themselves when no
  // GROQ_API_KEY is set (e.g. in CI), rather than failing on a "not configured"
  // response they can't control.
  res.status(200).json({
    status: 'ok',
    chat: Boolean(process.env.GROQ_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/integrations/gmail', gmailRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
