require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const callsRouter    = require('./routes/calls');
const webhookRouter  = require('./routes/webhook');
const analysisRouter = require('./routes/analysis');
const agentsRouter   = require('./routes/agents');
const authRouter     = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');
const { startWorker } = require('./workers/analysisWorker');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',     authRouter);
app.use('/api/calls',    callsRouter);
app.use('/api/analysis', requireAuth, analysisRouter);
app.use('/api/agents',   agentsRouter);
app.use('/webhook/recording', webhookRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Webhook: POST http://localhost:${PORT}/webhook/recording/`);
  startWorker();
});
