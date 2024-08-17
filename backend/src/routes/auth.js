const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Registration route
router.post('/register', async (req, res) => {
  console.log('Received registration data:', {...req.body, password: '[REDACTED]'});
  try {
    const { username, email, password, isAdmin, preferredManufacturers } = req.body;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password, // Password will be hashed in the pre-save hook
      isAdmin,
      preferredManufacturers: isAdmin ? [] : preferredManufacturers
    });

    // Save user to database
    await user.save();
    console.log('User saved to database:', {...user.toObject(), password: '[REDACTED]'});

    // Create and return JWT
    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            preferredManufacturers: user.preferredManufacturers
          }
        });
      }
    );
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).send('Server error');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt for username:', username);

    let user = await User.findOne({ username }).populate('preferredManufacturers', 'name');
    if (!user) {
      console.log('User not found:', username);
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    console.log('User found:', {...user.toObject(), password: '[REDACTED]'});

    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(400).json({ msg: "Invalid Credentials" });
    }

    console.log('Login successful for user:', username);

    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          isAdmin: user.isAdmin,
          preferredManufacturers: user.isAdmin ? null : user.preferredManufacturers.map(m => m.name)
        });
      }
    );
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Server error');
  }
});

router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('preferredManufacturers', 'name');
    res.json({
      ...user.toObject(),
      preferredManufacturers: user.preferredManufacturers.map(m => m.name)
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;