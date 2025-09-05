const mongoose = require('mongoose');

const checkInSchema = new mongoose.Schema({
  officerId: {
    type: String,
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'out-of-zone'],
    default: 'active'
  }
});

checkInSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('CheckIn', checkInSchema);