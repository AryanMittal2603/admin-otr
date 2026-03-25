require('dotenv').config();
const express = require('express');
const cors = require('cors');

const callsRouter = require('./routes/calls');
const webhookRouter = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/calls', callsRouter);
app.use('/webhook', webhookRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: POST http://localhost:${PORT}/webhook`);
});
