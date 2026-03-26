const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalUrl: {
    type: String,
    required: true,
  },
  thumbnailUrls: {
    small: {
      type: String,
    },
    medium: {
      type: String,
    },
  },
  cloudinaryId: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  processedStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  processingError: {
    type: String,
  },
  faceCount: {
    type: Number,
    default: 0,
  },
  metadata: {
    width: Number,
    height: Number,
    format: String,
  },
});

// Compound indexes for efficient querying
photoSchema.index({ userId: 1, uploadedAt: -1 });
photoSchema.index({ userId: 1, processedStatus: 1 });

module.exports = mongoose.model('Photo', photoSchema);