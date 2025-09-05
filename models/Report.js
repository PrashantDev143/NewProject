const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  officerPerformance: [{
    officerId: String,
    attendance: Boolean,
    idleAlerts: Number,
    zoneViolations: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);