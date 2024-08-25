const mongoose = require('mongoose');

const AttemptSchema = new mongoose.Schema({
  bikeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bike',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'successful', 'cancelled'],
    default: 'open'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  cancellationReason: {
    type: String,
    enum: ['Bike is not there', 'Bike started moving', 'Started hunting a more retrievable bike']
  }
});

module.exports = mongoose.model('Attempt', AttemptSchema);