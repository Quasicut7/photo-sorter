const mongoose = require('mongoose');

const faceClusterSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true,
  },
  photoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    required: true,
    index: true,
  },
  faceLocation: {
    top: {
      type: Number,
      required: true,
    },
    right: {
      type: Number,
      required: true,
    },
    bottom: {
      type: Number,
      required: true,
    },
    left: {
      type: Number,
      required: true,
    },
  },
  encoding: {
    type: [Number],
    required: true,
  },
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound indexes for efficient querying
faceClusterSchema.index({ userId: 1, personId: 1 });
faceClusterSchema.index({ userId: 1, photoId: 1 });
faceClusterSchema.index({ personId: 1, createdAt: -1 });

module.exports = mongoose.model('FaceCluster', faceClusterSchema);
