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
const Manufacturer = require('../models/Manufacturer');

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
// Get all bikes with filters
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('preferredManufacturers');
    const { search, manufacturer, lastSignal } = req.query;
    
    let query = { reportStatus: 'investigating' };

    // Manufacturer filter
    if (manufacturer) {
      if (!user.isAdmin && !user.preferredManufacturers.some(m => m.name === manufacturer)) {
        return res.status(403).json({ message: 'You do not have access to this manufacturer' });
      }
      query.make = manufacturer;
    } else if (!user.isAdmin) {
      query.make = { $in: user.preferredManufacturers.map(m => m.name) };
    }

    // Last signal filter
    if (lastSignal) {
      const now = new Date();
      switch (lastSignal) {
        case 'recent':
          query.lastSignal = { $gte: new Date(now - 60 * 60 * 1000) };
          break;
        case 'moderate':
          query.lastSignal = { 
            $lt: new Date(now - 60 * 60 * 1000),
            $gte: new Date(now - 24 * 60 * 60 * 1000)
          };
          break;
        case 'old':
          query.lastSignal = { $lt: new Date(now - 24 * 60 * 60 * 1000) };
          break;
      }
    }

    // Search filter
    if (search) {
      const missingReports = await MissingReport.find({ memberEmail: search });
      const bikeIds = missingReports.map(report => report.bikeId);
      
      query.$or = [
        { serialNumber: search },
        { _id: { $in: bikeIds } }
      ];
    }

    const bikes = await Bike.find(query);
    
    // Only return preferred manufacturers for non-admin users
    const availableManufacturers = user.isAdmin 
      ? await Manufacturer.find({}, 'name')
      : user.preferredManufacturers;

    res.json({ 
      bikes, 
      manufacturers: availableManufacturers.map(m => m.name)
    });
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

    if (!bikeId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const updatedBike = await Bike.findByIdAndUpdate(
      bikeId,
      { 
        $set: { 
          'location.coordinates': [longitude, latitude],
          lastSignal: new Date()
        } 
      },
      { new: true }
    );

    if (!updatedBike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    const io = req.app.get('io');
    
    console.log('Emitting bikeLocationUpdated event:', { 
      bike: updatedBike, 
      newLocation: { coordinates: [longitude, latitude] } 
    });
    
    io.emit('bikeLocationUpdated', { 
      bike: updatedBike, 
      newLocation: { coordinates: [longitude, latitude] } 
    });

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

    const paymentLink = `http://localhost:5001/pay/${bikeId}`; // Replace with your actual domain

    const bikeDetails = {
      make: bike.make,
      model: bike.model,
      location: `${location.name}, ${location.address}`
    };

    await sendEmail(
      missingReport.memberEmail,
      'Your Bike Has Been Found!',
      bikeDetails,
      paymentLink
    );

    res.json({ message: 'Bike marked as found and email sent', bike });
  } catch (error) {
    console.error('Error marking bike as found:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/check-updates/:bikeId', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { lastUpdateTime } = req.query;

    const bike = await Bike.findById(bikeId);
    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    if (new Date(bike.updatedAt) > new Date(lastUpdateTime)) {
      const latestLocation = await BikeLocation.findOne({ bikeId }).sort('-timestamp');
      res.json({ hasUpdate: true, bike, newLocation: latestLocation });
    } else {
      res.json({ hasUpdate: false });
    }
  } catch (error) {
    console.error('Error checking for bike updates:', error);
    res.status(500).json({ message: 'Server error while checking for updates' });
  }
});

module.exports = router;