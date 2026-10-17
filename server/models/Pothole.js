import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    imageUrl: String,
    imagePublicId: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    accuracy: Number,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], required: true },
    score: { type: Number, required: true },
    confidence: Number,
    bbox: [Number],
    reports: { type: Number, default: 1 },
    status: { type: String, enum: ['new', 'verified', 'fixed'], default: 'new' },
  },
  { timestamps: true }
);
schema.index({ location: '2dsphere' });
export default mongoose.model('Pothole', schema);
