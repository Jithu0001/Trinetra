import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/Admin.js';

const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) { console.error('Set MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD in .env'); process.exit(1); }
await mongoose.connect(MONGO_URI);
await Admin.findOneAndUpdate(
  { email: ADMIN_EMAIL.toLowerCase() },
  { passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10) },
  { upsert: true }
);
console.log('Admin ready:', ADMIN_EMAIL);
await mongoose.disconnect();
