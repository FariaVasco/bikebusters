const express = require('express');
const router = express.Router();
const Manufacturer = require('../models/Manufacturer');

router.get('/', async (req, res) => {
  try {
    const manufacturers = await Manufacturer.find({}, 'name');
    res.json(manufacturers);
  } catch (err) {
    console.error('Error fetching manufacturers:', err);
    res.status(500).json({ message: 'Error fetching manufacturers' });
  }
});

module.exports = router;