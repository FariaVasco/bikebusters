const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const BikeSchema = new Schema({
  make: {
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
  trackerId: {
    type: String,
    validate: {
      validator: function(v) {
        return v === undefined || v === '' || /^[a-f0-9]{8}$/.test(v);
      },
      message: props => `${props.value} is not a valid tracker ID!`
    }
  },
  userId: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false
    },
    coordinates: {
      type: [Number],
      required: false
    }
  },
  lastSignal: {
    type: Date,
    default: null
  },
  reportStatus: {
    type: String,
    enum: ['pending', 'investigating', 'resolved'],
    default: 'pending'
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  isPaid: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

BikeSchema.index({ location: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Bike', BikeSchema, 'bikes');