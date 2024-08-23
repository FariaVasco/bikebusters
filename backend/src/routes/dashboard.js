const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('preferredManufacturers');
    const { isAdmin } = user;
    const manufacturers = user.preferredManufacturers.map(m => m.name);

    let bikeQuery = {};
    if (!isAdmin) {
      bikeQuery.make = { $in: manufacturers };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bikeStatusCounts = await Bike.aggregate([
      { $match: bikeQuery },
      { $group: { _id: "$reportStatus", count: { $sum: 1 } } },
      { $project: { name: "$_id", value: "$count" } }
    ]);

    const newBikesToday = await Bike.countDocuments({
      ...bikeQuery,
      createdAt: { $gte: today }
    });

    const retrievedByManufacturer = await Bike.aggregate([
      { $match: { ...bikeQuery, reportStatus: 'resolved' } },
      { $group: { _id: "$make", count: { $sum: 1 } } },
      { $project: { name: "$_id", count: 1 } }
    ]);

    const userRetrievedBikes = await Bike.aggregate([
      { $match: { ...bikeQuery, reportStatus: 'resolved', userId: req.user._id } },
      {
        $group: {
          _id: null,
          daily: { $sum: { $cond: [{ $gte: ["$updatedAt", today] }, 1, 0] } },
          monthly: { $sum: { $cond: [{ $gte: ["$updatedAt", new Date(today.getFullYear(), today.getMonth(), 1)] }, 1, 0] } },
          yearly: { $sum: { $cond: [{ $gte: ["$updatedAt", new Date(today.getFullYear(), 0, 1)] }, 1, 0] } }
        }
      }
    ]);

    const dailyTarget = 200;
    const breakEvenTarget = 20000;

    const totalRetrievedToday = await Bike.countDocuments({
      ...bikeQuery,
      reportStatus: 'resolved',
      updatedAt: { $gte: today }
    });

    const totalRetrievedThisMonth = await Bike.countDocuments({
      ...bikeQuery,
      reportStatus: 'resolved',
      updatedAt: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) }
    });

    const dailyTargetProgress = (totalRetrievedToday / dailyTarget) * 100;
    const breakEvenProgress = (totalRetrievedThisMonth / breakEvenTarget) * 100;

    const totalBikes = await Bike.countDocuments(bikeQuery);
    const totalRetrieved = await Bike.countDocuments({ ...bikeQuery, reportStatus: 'resolved' });

    // Retrieval trend for the last 30 days
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const retrievalTrend = await Bike.aggregate([
      {
        $match: {
          ...bikeQuery,
          reportStatus: 'resolved',
          updatedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          retrieved: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", retrieved: 1, _id: 0 } }
    ]);

    res.json({
      bikeStatusCounts,
      newBikesToday,
      retrievedByManufacturer,
      userRetrievedBikes: userRetrievedBikes[0] || { daily: 0, monthly: 0, yearly: 0 },
      dailyTargetProgress,
      breakEvenProgress,
      totalBikes,
      totalRetrieved,
      retrievalTrend
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;