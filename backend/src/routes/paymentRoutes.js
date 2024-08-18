const express = require('express');
const router = express.Router();
const Bike = require('../models/Bike');

router.get('/:bikeId', async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.bikeId);
    if (!bike) {
      return res.status(404).send('Bike not found');
    }
    
    // Render a simple payment form
    res.send(`
      <h1>Payment for Bike Recovery</h1>
      <p>Bike: ${bike.make} ${bike.model}</p>
      <p>Amount: $50</p>
      <form action="/pay/${bike._id}/process" method="POST">
        <input type="submit" value="Pay $50">
      </form>
    `);
  } catch (error) {
    res.status(500).send('Server error');
  }
});

router.post('/:bikeId/process', async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.bikeId);
    if (!bike) {
      return res.status(404).send('Bike not found');
    }
    
    // In a real scenario, you'd process the payment here
    // For now, we'll just mark the bike as paid
    bike.isPaid = true;
    await bike.save();
    
    res.send('Payment processed successfully! You can now pick up your bike.');
  } catch (error) {
    res.status(500).send('Server error');
  }
});

module.exports = router;