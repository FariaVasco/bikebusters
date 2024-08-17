const express = require('express');
const router = express.Router();
const BikeBustersLocation = require('../models/BikeBustersLocation');

// GET all BikeBusters locations
router.get('/', async (req, res) => {
  try {
    const locations = await BikeBustersLocation.find();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching BikeBusters locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;