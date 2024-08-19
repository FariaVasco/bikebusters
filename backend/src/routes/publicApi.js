const express = require('express');
const router = express.Router();
const bikeController = require('../controllers/bikeController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const rateLimit = require('express-rate-limit');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Apply rate limiting to all routes
router.use(apiLimiter);

// Apply API key authentication to all routes
router.use(apiKeyAuth);

/**
 * @swagger
 * /api/v1/bikes:
 *   get:
 *     summary: Get all bikes (with pagination)
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of bikes
 *       401:
 *         description: Unauthorized - Invalid API key
 *       429:
 *         description: Too Many Requests
 */
router.get('/bikes', bikeController.getAllBikes);

/**
 * @swagger
 * /api/v1/bikes/{id}:
 *   get:
 *     summary: Get a specific bike
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bike ID
 *     responses:
 *       200:
 *         description: Details of a specific bike
 *       401:
 *         description: Unauthorized - Invalid API key
 *       404:
 *         description: Bike not found
 *       429:
 *         description: Too Many Requests
 */
router.get('/bikes/:id', bikeController.getBikeById);

/**
 * @swagger
 * /api/v1/bikes/search:
 *   get:
 *     summary: Search bikes
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *       - in: query
 *         name: model
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of bikes matching the search criteria
 *       401:
 *         description: Unauthorized - Invalid API key
 *       429:
 *         description: Too Many Requests
 */
router.get('/bikes/search', bikeController.searchBikes);

/**
 * @swagger
 * /api/v1/statistics:
 *   get:
 *     summary: Get bike statistics
 *     tags: [Public API]
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Statistical information about bikes
 *       401:
 *         description: Unauthorized - Invalid API key
 *       429:
 *         description: Too Many Requests
 */
router.get('/statistics', bikeController.getBikeStatistics);

module.exports = router;