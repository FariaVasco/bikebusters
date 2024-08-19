const express = require('express');
const router = express.Router();
const BikeBustersLocation = require('../models/BikeBustersLocation');

/**
 * @swagger
 * /api/bikebusterslocations:
 *   get:
 *     summary: Get all BikeBusters locations
 *     tags: [BikeBusters Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all BikeBusters locations
 *       500:
 *         description: Server error
 */

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