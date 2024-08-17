const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const crypto = require('crypto');
const MissingReport = require('../models/MissingReport');


router.post('/report', async (req, res) => {
  try {
    const {
      manufacturer,
      model,
      serialNumber,
      trackerId,
      lastSeenDate,
      realizedMissingDate,
      latitude,
      longitude
    } = req.body;

    // Generate a random userId
    const userId = crypto.randomBytes(16).toString('hex');

    // Validate trackerId if provided
    if (trackerId) {
      const trackerIdRegex = /^[a-f0-9]{8}$/;
      if (!trackerIdRegex.test(trackerId)) {
        return res.status(400).json({ message: 'Invalid Tracker ID format' });
      }
    }

    const newBikeData = {
        make: manufacturer,
        model,
        serialNumber,
        userId,
        trackerId: trackerId || undefined,
        lastSignal: null,
      };

    // Only add location if valid coordinates are provided
    if (typeof latitude === 'number' && typeof longitude === 'number') {
        newBikeData.location = {
            type: 'Point',
            coordinates: [longitude, latitude]
        };
    }

    const newBike = new Bike(newBikeData);
    await newBike.save();

    // Create new missing report entry
    const newMissingReport = new MissingReport({
        make: manufacturer,
        model,
        serialNumber,
        lastSeenOn: new Date(lastSeenDate),
        missingSince: new Date(realizedMissingDate),
        bikeId: newBike._id
      });
  
    await newMissingReport.save();

    res.status(201).json({
      message: 'Stolen bike reported successfully',
      bikeId: newBike._id,
      reportId: newMissingReport._id,
      userId: userId
    });
  } catch (error) {
    console.error('Error reporting stolen bike:', error);
    res.status(500).json({ message: 'Server error while reporting stolen bike', error: error.message });
  }
});

module.exports = router;