const mongoose = require('mongoose');

const ManufacturerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true
  },
});

module.exports = mongoose.model('Manufacturer', ManufacturerSchema);