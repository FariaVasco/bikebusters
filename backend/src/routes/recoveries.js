const express = require('express');
const router = express.Router();
const Recovery = require('../models/Recovery');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const recoveries = await Recovery.find().sort({ recoveryDate: -1 }).limit(10);
    res.json(recoveries);
  } catch (error) {
    console.error('Error fetching recoveries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;