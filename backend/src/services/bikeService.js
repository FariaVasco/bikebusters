const Bike = require('../models/Bike');
const BikeLocation = require('../models/BikeLocation');


const bikeService = {
  updateBikeLocation: async (bikeId, latitude, longitude) => {
    console.log(`Attempting to update location for bike ${bikeId}`);
    try {
      const bike = await Bike.findById(bikeId);
      if (!bike) throw new Error('Bike not found');
      const updatedBike = await Bike.findByIdAndUpdate(
        bikeId,
        {
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          lastSignal: new Date(),
          reportStatus: bike.reportStatus === 'pending' ? 'investigating' : bike.reportStatus
        },
        { new: true }
      );

      if (!updatedBike) {
        console.log(`Bike ${bikeId} not found during update`);
        throw new Error('Bike not found');
      }

      console.log('Bike updated successfully:', updatedBike);

      const newBikeLocation = new BikeLocation({
        bikeId: bikeId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      });
      await newBikeLocation.save();
      console.log('New bike location record created:', newBikeLocation);

      return updatedBike;
    } catch (error) {
      console.error('Error in updateBikeLocation:', error);
      throw error;
    }
  },

  getBikeLocationHistory: async (bikeId, startDate, endDate) => {
    try {
      const query = { bikeId: bikeId };
      if (startDate && endDate) {
        query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      const locationHistory = await BikeLocation.find(query).sort({ timestamp: 1 });
      return locationHistory;
    } catch (error) {
      console.error('Error fetching bike location history:', error);
      throw error;
    }
  },

  getAllBikeLocations: async (bikeId) => {
    try {
      const locations = await BikeLocation.find({ bikeId }).sort({ timestamp: 1 });
      return locations;
    } catch (error) {
      console.error('Error fetching bike locations:', error);
      throw error;
    }
  },
};

module.exports = bikeService;