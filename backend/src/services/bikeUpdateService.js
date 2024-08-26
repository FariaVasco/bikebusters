const SimulatedBikeUpdate = require('../models/SimulatedBikeUpdate');
const Bike = require('../models/Bike');
const BikeLocation = require('../models/BikeLocation');

class BikeUpdateService {
  async pollForUpdates() {
    console.log('Starting polling cycle');
    try {
      const simulatedUpdates = await SimulatedBikeUpdate.find().sort('timestamp');
      for (const update of simulatedUpdates) {
        await this.processUpdate(update);
      }
      console.log('Polling cycle completed');
    } catch (error) {
      console.error('Error in polling cycle:', error);
    }
  }

  async processUpdate(update) {
    try {
      const bike = await Bike.findById(update.bikeId);
      if (bike) {
        // Update bike location
        bike.location = update.location;
        bike.lastSignal = update.timestamp;
        await bike.save();

        // Create new bike location entry
        const bikeLocation = new BikeLocation({
          bikeId: bike._id,
          location: update.location,
          timestamp: update.timestamp
        });
        await bikeLocation.save();

        console.log(`Updated location for bike ${bike._id}`);

        // Remove the processed update
        await SimulatedBikeUpdate.findByIdAndDelete(update._id);
      } else {
        console.log(`Bike not found for update: ${update._id}`);
      }
    } catch (error) {
      console.error(`Error processing update for bike ${update.bikeId}:`, error);
    }
  }
}

module.exports = new BikeUpdateService();