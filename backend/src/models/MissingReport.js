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
  },
  unlockCode: {
    type: String,
    validate: {
      validator: function(v) {
        return /^\d{3}$/.test(v);
      },
      message: props => `${props.value} is not a valid 3-digit code!`
    }
  },
  isKeyChain: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    enum: ['Debt', 'Stolen', 'Other'],
    required: true
  },
  otherReason: {
    type: String
  },
  policeReportFile: {
    type: String // This will store the file path or URL
  },
  updateMechanism: {
    type: Boolean,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('MissingReport', MissingReportSchema);