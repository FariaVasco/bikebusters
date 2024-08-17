const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Existing user routes (if any) go here

// Add the new route to update user access
router.put('/updateAccess/:userId', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ msg: 'Not authorized' });
    }

    const { isAdmin, accessibleMakes } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isAdmin, accessibleMakes },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error updating user access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;