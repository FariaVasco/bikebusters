const mongoose = require('mongoose');

const RecoverySchema = new mongoose.Schema({
  bike: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bike',
    required: true
  },
  foundBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recoveryDate: {
    type: Date,
    default: Date.now
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BikeBustersLocation',
    required: true
  },
  notes: {
    type: String
  }
});

module.exports = mongoose.model('Recovery', RecoverySchema);