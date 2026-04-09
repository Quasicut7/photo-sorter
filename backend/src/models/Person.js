const mongoose = require('mongoose');

const personSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: null,
    trim: true,
  },
  photoCount: {
    type: Number,
    default: 0,
  },
  representativePhotoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
    default: null,
  },
  manualPhotoIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Photo',
  }],
  averageEncoding: {
    type: [Number],
    default: null,
  },
}, {
  timestamps: true,
});

// Index for efficient user queries
personSchema.index({ userId: 1, createdAt: -1 });

// Virtual for unnamed person label
personSchema.virtual('displayName').get(function () {
  return this.name || `Unnamed Person ${this._id.toString().substring(0, 4)}`;
});

// Ensure virtuals are included in JSON output
personSchema.set('toJSON', { virtuals: true });
personSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Person', personSchema);
