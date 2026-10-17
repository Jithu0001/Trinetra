import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import auth from './routes/auth.js';
import potholes from './routes/potholes.js';

const app = express();
app.use(cors({
  origin: [ 
    'http://localhost:5173',  // Allows local Vite frontend (HTTP)
    'https://localhost:5173'  // Allows secure local Vite frontend (HTTPS)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
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

await mongoose.connect(process.env.MONGODB_URI, {
  ssl: true,
  // If the issue persists, you can temporarily add this to debug:
  // tlsAllowInvalidCertificates: false 
})
.then(() => console.log("MongoDB Connected..."))
.catch(err => console.error("Database connection error:", err));
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`API running on port ${port}`));
