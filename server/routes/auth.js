import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import Admin from '../models/Admin.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.post('/login', limiter, async (req, res, next) => {
  try {
    const { email = '', password = '' } = req.body;
    const admin = await Admin.findOne({ email: String(email).toLowerCase() });
    if (!admin || !(await bcrypt.compare(String(password), admin.passwordHash)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.json({ token });
  } catch (e) { next(e); }
});
export default router;
