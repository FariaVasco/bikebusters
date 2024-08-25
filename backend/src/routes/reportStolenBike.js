const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const crypto = require('crypto');
const MissingReport = require('../models/MissingReport');

/**
 * @swagger
 * /api/bikes/report:
 *   post:
 *     summary: Report a stolen bike
 *     tags: [Bikes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - manufacturer
 *               - model
 *               - serialNumber
 *               - lastSeenDate
 *               - realizedMissingDate
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
 *     responses:
 *       201:
 *         description: Stolen bike reported successfully
 *       400:
 *         description: Invalid input data
 *       500:
 *         description: Server error
 */

router.post('/report', async (req, res) => {
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
      longitude
    } = req.body;

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
        coordinates: [longitude, latitude]
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
        coordinates: [longitude, latitude]
      }
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