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
const Recovery = require('../models/Recovery');
const Attempt = require('../models/Attempt');
const SimulatedBikeUpdate = require('../models/SimulatedBikeUpdate');

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

    // First, find the bike
    const bike = await Bike.findById(bikeId);

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    // Prepare the update object
    const updateObj = {
      'location.coordinates': [longitude, latitude],
      lastSignal: new Date()
    };

    // If the bike's status is 'pending', update it to 'investigating'
    if (bike.reportStatus === 'pending') {
      updateObj.reportStatus = 'investigating';
    }

    const updatedBike = await Bike.findByIdAndUpdate(
      bikeId,
      { $set: updateObj },
      { new: true }
    );

    console.log('Bike updated:', updatedBike);

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
    res.status(500).json({ message: 'Server error while updating bike location', error: error.message });
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
 *     summary: Mark a bike as found and update related attempt
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
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bike marked as found, recovery record created, and attempt updated
 *       404:
 *         description: Bike not found
 *       500:
 *         description: Server error
 */

router.post('/:bikeId/found', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { bikebustersLocationId, notes } = req.body;

    console.log('Marking bike as found:', { bikeId, bikebustersLocationId, notes });

    // Update bike status
    const bike = await Bike.findByIdAndUpdate(bikeId, 
      { reportStatus: 'resolved', bikebustersLocationId },
      { new: true }
    );

    if (!bike) {
      console.log('Bike not found:', bikeId);
      return res.status(404).json({ message: 'Bike not found' });
    }

    console.log('Bike found and updated:', bike);

    // Update attempt status if exists
    const attempt = await Attempt.findOneAndUpdate(
      { bikeId, status: 'open' },
      { status: 'successful', endTime: new Date() },
      { new: true }
    );

    console.log('Attempt updated:', attempt);

    // Create recovery record
    const recovery = new Recovery({
      bike: bikeId,
      foundBy: req.user._id,
      location: bikebustersLocationId,
      notes: notes || ''
    });

    await recovery.save();
    console.log('Recovery record created:', recovery);

    const location = await BikeBustersLocation.findById(bikebustersLocationId);

    if (!location) {
      console.log('BikeBusters location not found:', bikebustersLocationId);
      return res.status(404).json({ message: 'BikeBusters location not found' });
    }

    console.log('BikeBusters location found:', location);

    // Find the missing report
    let missingReport = null;
    try {
      missingReport = await MissingReport.findOne({ bikeId: bike._id });
      console.log('Missing Report found:', missingReport);
    } catch (missingReportError) {
      console.error('Error finding missing report:', missingReportError);
    }

    let emailSent = false;

    if (missingReport) {
      // B2C case
      const paymentLink = `http://localhost:5001/pay/${bikeId}`; // Replace with your actual domain

      try {
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
        emailSent = true;
        console.log('B2C email sent to:', missingReport.memberEmail);
      } catch (emailError) {
        console.error('Error sending B2C email:', emailError);
      }
    } else {
      // B2B case
      try {
        const manufacturerDoc = await Manufacturer.findOne({ name: bike.make });
        if (manufacturerDoc && manufacturerDoc.email) {
          await sendEmail(
            manufacturerDoc.email,
            'Your Bike Has Been Found',
            {
              manufacturer: bike.make,
              bikes: [bike],
              location: `${location.name}, ${location.address}`
            },
            `/api/invoices/${bike.make}`
          );
          emailSent = true;
          console.log('B2B email sent to:', manufacturerDoc.email);
        } else {
          console.log('No valid manufacturer email found for:', bike.make);
        }
      } catch (manufacturerError) {
        console.error('Error handling B2B case:', manufacturerError);
      }
    }

    res.json({ 
      message: `Bike marked as found, recovery record created${emailSent ? ', and email sent' : ''}`, 
      bike,
      recovery,
      attempt,
      missingReport // Include this in the response for debugging
    });
  } catch (error) {
    console.error('Error marking bike as found:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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
 *     summary: Mark multiple bikes as found and update related attempts
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
 *               bikebustersLocationId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bikes marked as found, recovery records created, and attempts updated
 *       404:
 *         description: No bikes found with the provided serial numbers
 *       500:
 *         description: Server error
 */

router.post('/mark-multiple-found', auth, async (req, res) => {
  try {
    const { serialNumbers, bikebustersLocationId, notes } = req.body;
    
    const bikes = await Bike.find({ serialNumber: { $in: serialNumbers } });

    if (bikes.length === 0) {
      return res.status(404).json({ message: 'No bikes found with the provided serial numbers' });
    }

    const updatedBikes = [];
    const recoveryRecords = [];
    const updatedAttempts = [];
    const bikesByManufacturer = {}; // Initialize the object here

    for (const bike of bikes) {
      // Update bike status
      bike.reportStatus = 'resolved';
      bike.bikebustersLocationId = bikebustersLocationId;
      await bike.save();
      updatedBikes.push(bike);

      // Update attempt status if exists
      const attempt = await Attempt.findOneAndUpdate(
        { bikeId: bike._id, status: 'open' },
        { status: 'successful', endTime: new Date() },
        { new: true }
      );
      if (attempt) {
        updatedAttempts.push(attempt);
      }

      // Create recovery record
      const recovery = new Recovery({
        bike: bike._id,
        foundBy: req.user._id,
        location: bikebustersLocationId,
        notes: notes || ''
      });
      await recovery.save();
      recoveryRecords.push(recovery);

      // Group bikes by manufacturer
      if (!bikesByManufacturer[bike.make]) {
        bikesByManufacturer[bike.make] = [];
      }
      bikesByManufacturer[bike.make].push(bike);
    }

    const location = await BikeBustersLocation.findById(bikebustersLocationId);
    if (!location) {
      return res.status(404).json({ message: 'BikeBusters location not found' });
    }
    console.log('Found location:', location);

    const emailPromises = [];

    for (const [manufacturer, manufacturerBikes] of Object.entries(bikesByManufacturer)) {
      console.log(`Processing manufacturer: ${manufacturer}`);
      const manufacturerDoc = await Manufacturer.findOne({ name: manufacturer });
      console.log('Manufacturer document:', manufacturerDoc);
      
      if (manufacturerDoc && manufacturerDoc.email) {
        console.log(`Preparing email for ${manufacturerDoc.email}`);
        const emailPromise = sendEmail(
          manufacturerDoc.email,
          'Multiple Bikes Found',
          {
            manufacturer: manufacturer,
            bikes: manufacturerBikes,
            location: `${location.name}, ${location.address}`
          },
          `/api/invoices/${manufacturer}`
        ).catch(error => {
          console.error(`Error sending email to ${manufacturerDoc.email}:`, error);
          return { error, manufacturer };
        });

        emailPromises.push(emailPromise);
      } else {
        console.log(`No valid email found for manufacturer ${manufacturer}`);
      }
    }

    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter(result => !result.error);
    const failedEmails = emailResults.filter(result => result.error);

    console.log(`Emails sent successfully: ${successfulEmails.length}`);
    console.log(`Failed emails: ${failedEmails.length}`);

    if (failedEmails.length > 0) {
      console.log('Failed emails:', failedEmails.map(f => f.manufacturer).join(', '));
    }

    res.json({ 
      message: 'Bikes marked as found, recovery records created, and attempts updated', 
      updatedBikes,
      recoveryRecords,
      updatedAttempts
    });
  } catch (error) {
    console.error('Error marking multiple bikes as found:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/bikes/{bikeId}/lost:
 *   post:
 *     summary: Mark a bike as lost
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
 *         description: Bike marked as lost successfully
 *       404:
 *         description: Bike not found
 *       500:
 *         description: Server error
 */
router.post('/:bikeId/lost', auth, async (req, res) => {
  try {
    const bike = await Bike.findByIdAndUpdate(
      req.params.bikeId,
      { reportStatus: 'lost' },
      { new: true }
    );

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    res.json({ success: true, bike });
  } catch (error) {
    console.error('Error marking bike as lost:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/bikes/{bikeId}/start-attempt:
 *   post:
 *     summary: Start a new attempt to retrieve a bike or return existing open attempt
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
 *         description: Existing attempt returned
 *       201:
 *         description: New attempt created successfully
 *       500:
 *         description: Server error
 */

router.post('/:bikeId/start-attempt', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const userId = req.user._id;

    console.log(`Starting attempt for bike: ${bikeId} by user: ${userId}`);

    // Check if there's an open attempt for this bike
    let existingAttempt = await Attempt.findOne({ bikeId, status: 'open' });
    
    if (existingAttempt) {
      console.log(`Existing open attempt found: ${existingAttempt._id}`);
      return res.status(200).json({ 
        message: 'An attempt is already in progress for this bike',
        attempt: existingAttempt
      });
    }

    // Create a new attempt
    const newAttempt = new Attempt({
      bikeId,
      userId,
      status: 'open'
    });

    await newAttempt.save();
    console.log(`New attempt created: ${newAttempt._id}`);

    res.status(201).json({
      message: 'New attempt started successfully',
      attempt: newAttempt
    });
  } catch (error) {
    console.error('Error starting attempt:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

/**
 * @swagger
 * /api/bikes/{bikeId}/cancel-attempt:
 *   post:
 *     summary: Cancel an open attempt for a bike
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
 *               - cancellationReason
 *             properties:
 *               cancellationReason:
 *                 type: string
 *                 enum: ['Bike is not there', 'Bike started moving', 'Started hunting a more retrievable bike']
 *     responses:
 *       200:
 *         description: Attempt cancelled successfully
 *       404:
 *         description: No open attempt found for this bike
 *       500:
 *         description: Server error
 */

router.post('/:bikeId/cancel-attempt', auth, async (req, res) => {
  try {
    const { bikeId } = req.params;
    const { cancellationReason } = req.body;

    const attempt = await Attempt.findOneAndUpdate(
      { bikeId, status: 'open' },
      { status: 'cancelled', endTime: new Date(), cancellationReason },
      { new: true }
    );

    if (!attempt) {
      return res.status(404).json({ message: 'No open attempt found for this bike' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Error cancelling attempt:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/bikes/simulate-update:
 *   post:
 *     summary: Simulate a bike location update
 *     tags: [Bikes]
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
 *       201:
 *         description: Simulated update created successfully
 *       500:
 *         description: Server error
 */
router.post('/simulate-update', async (req, res) => {
  try {
    const { bikeId, latitude, longitude } = req.body;

    const simulatedUpdate = new SimulatedBikeUpdate({
      bikeId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      }
    });

    await simulatedUpdate.save();

    res.status(201).json({ message: 'Simulated update created successfully' });
  } catch (error) {
    console.error('Error creating simulated update:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;