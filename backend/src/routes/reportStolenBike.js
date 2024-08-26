const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const crypto = require('crypto');
const MissingReport = require('../models/MissingReport');
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Ensure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });

/**
 * @swagger
 * /api/bikes/report:
 *   post:
 *     summary: Report a stolen bike
 *     tags: [Bikes]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - manufacturer
 *               - model
 *               - serialNumber
 *               - lastSeenDate
 *               - realizedMissingDate
 *               - reason
 *               - updateMechanism
 *             properties:
 *               manufacturer:
 *                 type: string
 *               model:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               trackerId:
 *                 type: string
 *                 pattern: '^[a-f0-9]{8}$'
 *               lastSeenDate:
 *                 type: string
 *                 format: date-time
 *               realizedMissingDate:
 *                 type: string
 *                 format: date-time
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               unlockCode:
 *                 type: string
 *                 pattern: '^\d{3}$'
 *               isKeyChain:
 *                 type: boolean
 *               reason:
 *                 type: string
 *                 enum: ['Debt', 'Stolen', 'Other']
 *               otherReason:
 *                 type: string
 *               updateMechanism:
 *                 type: boolean
 *               policeReportFile:
 *                 type: file
 *     responses:
 *       201:
 *         description: Stolen bike reported successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */

router.post('/report', upload.single('policeReportFile'), async (req, res) => {
  try {
    const {
      manufacturer,
      model,
      serialNumber,
      trackerId,
      lastSeenDate,
      realizedMissingDate,
      email,
      address,
      latitude,
      longitude,
      unlockCode,
      isKeyChain,
      reason,
      otherReason,
      updateMechanism
    } = req.body;

    // Validate required fields
    const requiredFields = ['manufacturer', 'model', 'serialNumber', 'lastSeenDate', 'realizedMissingDate', 'email', 'address', 'latitude', 'longitude', 'reason', 'updateMechanism'];
    for (let field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `Missing required field: ${field}` });
      }
    }

    // Validate reason
    if (reason === 'Other' && !otherReason) {
      return res.status(400).json({ message: 'Other reason must be provided when reason is "Other"' });
    }

    // Validate unlock code
    if (unlockCode && !/^\d{3}$/.test(unlockCode)) {
      return res.status(400).json({ message: 'Unlock code must be a 3-digit number' });
    }

    // Generate a random userId
    const userId = crypto.randomBytes(16).toString('hex');

    const newBike = new Bike({
      make: manufacturer,
      model,
      serialNumber,
      userId,
      trackerId: trackerId || undefined,
      lastSignal: null,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    });

    await newBike.save();

    const newMissingReport = new MissingReport({
      make: manufacturer,
      model,
      serialNumber,
      lastSeenOn: new Date(lastSeenDate),
      missingSince: new Date(realizedMissingDate),
      bikeId: newBike._id,
      memberEmail: email,
      lastKnownAddress: address,
      lastKnownLocation: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      unlockCode: unlockCode || undefined,
      isKeyChain: isKeyChain === 'true',
      reason: reason,
      otherReason: reason === 'Other' ? otherReason : undefined,
      updateMechanism: updateMechanism === 'true',
      policeReportFile: req.file ? req.file.path : undefined
    });

    await newMissingReport.save();

    res.status(201).json({
      message: 'Stolen bike reported successfully',
      bikeId: newBike._id,
      reportId: newMissingReport._id
    });
  } catch (error) {
    console.error('Error reporting stolen bike:', error);
    res.status(500).json({ message: 'Server error while reporting stolen bike', error: error.message });
  }
});

module.exports = router;