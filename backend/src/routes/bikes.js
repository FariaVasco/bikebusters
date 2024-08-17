const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Bike = require('../models/Bike');
const User = require('../models/User');
const MissingReport = require('../models/MissingReport');
const Note = require('../models/Note');
const bikeService = require('../services/bikeService');
const sendEmail = require('../services/emailService');
const BikeBustersLocation = require('../models/BikeBustersLocation');

// Create a new bike
router.post('/', auth, async (req, res) => {
  try {
    const { make, model, serialNumber, userId, location, lastSignal } = req.body;
    const newBike = new Bike({
      make,
      model,
      serialNumber,
      userId,
      location,
      lastSignal: lastSignal || new Date()
    });
    const savedBike = await newBike.save();
    res.status(201).json(savedBike);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all bikes
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('preferredManufacturers', 'name');
    
    let query = { reportStatus: 'investigating' };
    if (!user.isAdmin) {
      query.make = { $in: user.preferredManufacturers.map(m => m.name) };
    }

    const bikes = await Bike.find(query);
    res.json(bikes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get a specific bike
router.get('/:bikeId', auth, async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.bikeId);
    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }
    res.json(bike);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get missing report for a bike
router.get('/:bikeId/missing-report', auth, async (req, res) => {
  try {
    const report = await MissingReport.findOne({ bikeId: req.params.bikeId });
    if (!report) {
      return res.status(404).json({ message: 'Missing report not found' });
    }
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get notes for a bike
router.get('/:bikeId/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ bikeId: req.params.bikeId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add a note to a bike
router.post('/:bikeId/notes', auth, async (req, res) => {
  try {
    const newNote = new Note({
      bikeId: req.params.bikeId,
      content: req.body.content
    });
    await newNote.save();
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// New route for updating bike location
router.post('/update-location', auth, async (req, res) => {
  try {
    const { bikeId, latitude, longitude } = req.body;

    if (!bikeId || !latitude || !longitude) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const updatedBike = await bikeService.updateBikeLocation(bikeId, latitude, longitude);
    res.json(updatedBike);
  } catch (error) {
    console.error('Error updating bike location:', error);
    res.status(500).json({ message: 'Server error while updating bike location' });
  }
});

// New route for fetching bike location history
router.get('/:bikeId/location-history', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { startDate, endDate } = req.query;

    const locationHistory = await bikeService.getBikeLocationHistory(bikeId, startDate, endDate);
    res.json(locationHistory);
  } catch (error) {
    console.error('Error fetching bike location history:', error);
    res.status(500).json({ message: 'Server error while fetching bike location history' });
  }
});

router.get('/:bikeId/locations', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const locations = await bikeService.getAllBikeLocations(bikeId);
    res.json(locations);
  } catch (error) {
    console.error('Error fetching bike locations:', error);
    res.status(500).json({ message: 'Server error while fetching bike locations' });
  }
});

router.post('/:bikeId/found', async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { bikebustersLocationId } = req.body;

    const bike = await Bike.findByIdAndUpdate(bikeId, 
      { reportStatus: 'resolved', bikebustersLocationId },
      { new: true }
    );
  
    const missingReport = await MissingReport.findOne({ bikeId });
    const location = await BikeBustersLocation.findById(bikebustersLocationId);

    if (!missingReport || !location) {
      return res.status(404).json({ message: 'Missing report or location not found' });
    }

 // Send email
    const emailSubject = 'Your Bike Has Been Found!';
    const emailText = `Great news! We've found your bike (${bike.make} ${bike.model}). You can pick it up at ${location.name}, ${location.address}.`;
    const emailHtml = `
      <h1>Great news!</h1>
      <p>We've found your bike (${bike.make} ${bike.model}).</p>
      <p>You can pick it up at:</p>
      <p><strong>${location.name}</strong></p>
      <p>${location.address}</p>
      <p>Thank you for using BikeBusters!</p>
    `;

    await sendEmail(missingReport.memberEmail, emailSubject, emailText, emailHtml);

    res.json({ message: 'Bike marked as found and email sent', bike });
  } catch (error) {
    console.error('Error marking bike as found:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;