import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { v2 as cloudinary } from 'cloudinary';
import Pothole from '../models/Pothole.js';
import requireAuth from '../middleware/auth.js';
import { severityFromScore } from '../lib/severity.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Reports closer than this are merged into one record (reports counter goes up).
// Set MERGE_RADIUS_M=0 in .env to never merge (handy when testing at a desk).
const envRadius = parseFloat(process.env.MERGE_RADIUS_M);
const MERGE_RADIUS_M = Number.isNaN(envRadius) ? 8 : envRadius;
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1.5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    ['image/jpeg', 'image/png'].includes(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error('Only JPEG or PNG images'), { status: 400 })),
});
const publicLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });

const uploadImage = (buffer) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'potholes', transformation: [{ width: 800, crop: 'limit', quality: 'auto' }] },
        (err, result) => (err ? reject(err) : resolve(result)))
      .end(buffer);
  });

// PUBLIC: scanner uploads a detection
router.post('/potholes', publicLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const lat = Number(req.body.lat), lng = Number(req.body.lng);
    const score = Number(req.body.score), confidence = Number(req.body.confidence);
    const accuracy = Number(req.body.accuracy) || null;
    let bbox = [];
    try { bbox = JSON.parse(req.body.bbox || '[]').map(Number).slice(0, 4); } catch { /* ignore */ }

    if (!req.file) return res.status(400).json({ error: 'Image required' });
    if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return res.status(400).json({ error: 'Bad coordinates' });
    if (!(score >= 0 && score <= 100)) return res.status(400).json({ error: 'Bad score' });
    if (!(confidence >= 0.3 && confidence <= 1)) return res.status(400).json({ error: 'Bad confidence' });
    const severity = severityFromScore(score); // never trust the client's severity

    const near = MERGE_RADIUS_M > 0
      ? await Pothole.findOne({
          status: { $ne: 'fixed' },
          location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: MERGE_RADIUS_M } },
        })
      : null;
    if (near) {
      near.reports += 1;
      if (score > near.score) {
        const up = await uploadImage(req.file.buffer);
        if (near.imagePublicId) cloudinary.uploader.destroy(near.imagePublicId).catch(() => {});
        Object.assign(near, { imageUrl: up.secure_url, imagePublicId: up.public_id, score, severity, confidence, bbox, accuracy });
      }
      await near.save();
      return res.json({ merged: true, id: near._id });
    }

    const up = await uploadImage(req.file.buffer);
    const doc = await Pothole.create({
      imageUrl: up.secure_url, imagePublicId: up.public_id,
      location: { type: 'Point', coordinates: [lng, lat] },
      accuracy, severity, score, confidence, bbox,
    });
    res.status(201).json({ merged: false, id: doc._id });
  } catch (e) { next(e); }
});

// ADMIN routes
const find = async (id) => (mongoose.isValidObjectId(id) ? Pothole.findById(id) : null);

router.get('/potholes', requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const q = {};
    if (['LOW', 'MEDIUM', 'HIGH'].includes(req.query.severity)) q.severity = req.query.severity;
    if (['new', 'verified', 'fixed'].includes(req.query.status)) q.status = req.query.status;
    const [items, total] = await Promise.all([
      Pothole.find(q).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Pothole.countDocuments(q),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

router.get('/stats', requireAuth, async (_req, res, next) => {
  try {
    const [total, sev, st] = await Promise.all([
      Pothole.countDocuments(),
      Pothole.aggregate([{ $group: { _id: '$severity', n: { $sum: 1 } } }]),
      Pothole.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const toObj = (a) => Object.fromEntries(a.map((x) => [x._id, x.n]));
    res.json({ total, severity: toObj(sev), status: toObj(st) });
  } catch (e) { next(e); }
});

router.get('/potholes/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await find(req.params.id);
    doc ? res.json(doc) : res.status(404).json({ error: 'Not found' });
  } catch (e) { next(e); }
});

router.patch('/potholes/:id', requireAuth, async (req, res, next) => {
  try {
    if (!['new', 'verified', 'fixed'].includes(req.body.status)) return res.status(400).json({ error: 'Bad status' });
    const doc = await find(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    doc.status = req.body.status; await doc.save(); res.json(doc);
  } catch (e) { next(e); }
});

router.delete('/potholes/:id', requireAuth, async (req, res, next) => {
  try {
    const doc = await find(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.imagePublicId) await cloudinary.uploader.destroy(doc.imagePublicId).catch(() => {});
    await doc.deleteOne(); res.json({ ok: true });
  } catch (e) { next(e); }
});
export default router;