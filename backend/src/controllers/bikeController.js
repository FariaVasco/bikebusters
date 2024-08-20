const Bike = require('../models/Bike');

exports.getAllBikes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const bikes = await Bike.find()
      .select('-__v')
      .skip(startIndex)
      .limit(limit);

    const total = await Bike.countDocuments();

    res.json({
      bikes,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalBikes: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bikes', error: error.message });
  }
};

exports.getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).select('-__v');
    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }
    res.json(bike);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bike', error: error.message });
  }
};

exports.searchBikes = async (req, res) => {
  try {
    const { make, model, status } = req.query;
    const query = {};

    if (make) query.make = new RegExp(make, 'i');
    if (model) query.model = new RegExp(model, 'i');
    if (status) query.reportStatus = status;

    const bikes = await Bike.find(query).select('-__v');
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: 'Error searching bikes', error: error.message });
  }
};

exports.getBikeStatistics = async (req, res) => {
    try {
      const totalBikes = await Bike.countDocuments();
      const reportedStolen = await Bike.countDocuments({ reportStatus: 'investigating' });
      const recovered = await Bike.countDocuments({ reportStatus: 'resolved' });
      
      const now = new Date();
      const recentSignal = await Bike.countDocuments({ lastSignal: { $gte: new Date(now - 60 * 60 * 1000) } });
      const moderateSignal = await Bike.countDocuments({ 
        lastSignal: { 
          $lt: new Date(now - 60 * 60 * 1000),
          $gte: new Date(now - 24 * 60 * 60 * 1000)
        } 
      });
      const oldSignal = await Bike.countDocuments({ lastSignal: { $lt: new Date(now - 24 * 60 * 60 * 1000) } });
  
      const topManufacturers = await Bike.aggregate([
        { $group: { _id: "$make", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { name: "$_id", count: 1, _id: 0 } }
      ]);
  
      res.json({
        totalBikes,
        reportedStolen,
        recovered,
        recoveryRate: (recovered / reportedStolen) * 100,
        recentSignal,
        moderateSignal,
        oldSignal,
        topManufacturers
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ message: 'Error fetching statistics' });
    }
  };