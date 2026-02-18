import express from 'express';
import cors from 'cors';
import { missionsRouter } from './routes/missions.js';
import { targetsRouter } from './routes/targets.js';
import { agentRouter } from './routes/agent.js';
import { scraperRouter } from './routes/scraper.js';
import { gmapsRouter } from './routes/gmaps.js';
import { leadsRouter } from './routes/leads.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/missions', missionsRouter);
app.use('/api/targets', targetsRouter);
app.use('/api/agent', agentRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/gmaps', gmapsRouter);
app.use('/api/leads', leadsRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Captor Server running on http://localhost:${PORT}`);
});
