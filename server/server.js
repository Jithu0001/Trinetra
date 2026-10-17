import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import auth from './routes/auth.js';
import potholes from './routes/potholes.js';

const app = express();
app.set('trust proxy', 1); // needed behind Render's proxy (correct IPs for rate limiting)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api', potholes);

app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Image too large' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

await mongoose.connect(process.env.MONGO_URI);
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on port ${port}`));
