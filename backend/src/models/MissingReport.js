const mongoose = require('mongoose');

const MissingReportSchema = new mongoose.Schema({
  make: {
    type: String,
    required: true
  },
  memberEmail: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  serialNumber: {
    type: String,
    required: true
  },
  lastSeenOn: {
    type: Date,
    required: true
  },
  missingSince: {
    type: Date,
    required: true
  },
  bikeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bike',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('MissingReport', MissingReportSchema);