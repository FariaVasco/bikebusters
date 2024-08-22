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

/**
 * @swagger
 * /api/bikes:
 *   post:
 *     summary: Create a new bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - make
 *               - model
 *               - serialNumber
 *               - userId
 *             properties:
 *               make:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               userId:
 *                 type: string
 *               location:
 *                 type: object
 *               lastSignal:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Bike created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes:
 *   get:
 *     summary: Get all bikes
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: manufacturer
 *         schema:
 *           type: string
 *       - in: query
 *         name: lastSignal
 *         schema:
 *           type: string
 *           enum: [recent, moderate, old]
 *     responses:
 *       200:
 *         description: List of bikes
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/{bikeId}:
 *   get:
 *     summary: Get a specific bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bike details
 *       404:
 *         description: Bike not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/bikes/{bikeId}/missing-report:
 *   get:
 *     summary: Get missing report for a bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Missing report details
 *       404:
 *         description: Missing report not found
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/{bikeId}/notes:
 *   get:
 *     summary: Get notes for a bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of notes
 *       500:
 *         description: Server error
 */

// Get notes for a bike
router.get('/:bikeId/notes', auth, async (req, res) => {
  try {
    const notes = await Note.find({ bikeId: req.params.bikeId }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/bikes/{bikeId}/notes:
 *   post:
 *     summary: Add a note to a bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note added successfully
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/update-location:
 *   post:
 *     summary: Update bike location
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bikeId
 *               - latitude
 *               - longitude
 *             properties:
 *               bikeId:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *     responses:
 *       200:
 *         description: Bike location updated successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Bike not found
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/{bikeId}/location-history:
 *   get:
 *     summary: Get bike location history
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Bike location history
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/{bikeId}/locations:
 *   get:
 *     summary: Get all locations for a bike
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of bike locations
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/{bikeId}/found:
 *   post:
 *     summary: Mark a bike as found
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bikebustersLocationId
 *             properties:
 *               bikebustersLocationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bike marked as found and email sent
 *       404:
 *         description: Missing report or location not found
 *       500:
 *         description: Server error
 */

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

    await sendEmail(
      missingReport.memberEmail,
      'Your Bike Has Been Found!',
      {
        make: bike.make,
        model: bike.model,
        location: `${location.name}, ${location.address}`
      },
      paymentLink
    );

    res.json({ message: 'Bike marked as found and email sent', bike });
  } catch (error) {
    console.error('Error marking bike as found:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/bikes/check-updates/{bikeId}:
 *   get:
 *     summary: Check for bike updates
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bikeId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: lastUpdateTime
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Update status and bike information if updated
 *       404:
 *         description: Bike not found
 *       500:
 *         description: Server error
 */

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

/**
 * @swagger
 * /api/bikes/mark-multiple-found:
 *   post:
 *     summary: Mark multiple bikes as found
 *     tags: [Bikes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - serialNumbers
 *               - bikebustersLocationId
 *             properties:
 *               serialNumbers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of bike serial numbers
 *               bikebustersLocationId:
 *                 type: string
 *                 description: ID of the BikeBusters location where the bikes were found
 *     responses:
 *       200:
 *         description: Bikes marked as found and emails sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 bikes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bike'
 *       400:
 *         description: Invalid input or missing required fields
 *       404:
 *         description: One or more bikes not found
 *       500:
 *         description: Server error
 */

router.post('/mark-multiple-found', auth, async (req, res) => {
  console.log('Mark multiple bikes as found - request received');
  console.log('Request body:', req.body);
  
  try {
    const { serialNumbers, bikebustersLocationId } = req.body;
    console.log('Serial numbers:', serialNumbers);
    console.log('BikeBusters location ID:', bikebustersLocationId);
    
    const bikes = await Bike.find({ serialNumber: { $in: serialNumbers } });
    console.log('Found bikes:', bikes);

    if (bikes.length === 0) {
      console.log('No bikes found with the provided serial numbers');
      return res.status(404).json({ message: 'No bikes found with the provided serial numbers' });
    }

    const bikesByManufacturer = {};
    const updatedBikes = [];

    for (const bike of bikes) {
      console.log(`Updating bike: ${bike.serialNumber}`);
      bike.reportStatus = 'resolved';
      bike.bikebustersLocationId = bikebustersLocationId;
      const updatedBike = await bike.save();
      console.log(`Bike ${bike.serialNumber} updated:`, updatedBike);
      updatedBikes.push(updatedBike);

      if (!bikesByManufacturer[bike.make]) {
        bikesByManufacturer[bike.make] = [];
      }
      bikesByManufacturer[bike.make].push(bike);
    }

    const location = await BikeBustersLocation.findById(bikebustersLocationId);
    console.log('Found location:', location);

    for (const [manufacturer, manufacturerBikes] of Object.entries(bikesByManufacturer)) {
      console.log(`Processing manufacturer: ${manufacturer}`);
      const manufacturerDoc = await Manufacturer.findOne({ name: manufacturer });
      console.log('Manufacturer document:', manufacturerDoc);
      
      if (manufacturerDoc && manufacturerDoc.email) {
        console.log(`Attempting to send email to ${manufacturerDoc.email}`);
        try {
          await sendEmail(
            manufacturerDoc.email,
            'Multiple Bikes Found',
            {
              bikes: manufacturerBikes,
              location: `${location.name}, ${location.address}`
            },
            `/api/invoices/${manufacturer}`
          );
          console.log(`Email sent successfully to ${manufacturerDoc.email}`);
        } catch (error) {
          console.error(`Error sending email to ${manufacturerDoc.email}:`, error);
        }
      } else {
        console.log(`No valid email found for manufacturer ${manufacturer}`);
      }
    }

    console.log('All operations completed');
    res.json({ message: 'Bikes marked as found and emails sent', updatedBikes });
  } catch (error) {
    console.error('Error marking multiple bikes as found:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;