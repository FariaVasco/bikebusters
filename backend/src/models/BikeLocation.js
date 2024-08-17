const mongoose = require('mongoose');

const BikeLocationSchema = new mongoose.Schema({
  bikeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bike',
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
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
});

BikeLocationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('BikeLocation', BikeLocationSchema);