import mongoose from 'mongoose';
export default mongoose.model('Admin', new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
}));
