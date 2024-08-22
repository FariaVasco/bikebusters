const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('JWT_SECRET or JWT_REFRESH_SECRET is not set in the environment variables.');
  process.exit(1);
}

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

    console.log('Creating tokens with payload:', payload);

    // Add checks here
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error('JWT_REFRESH_SECRET is not set');
    }

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    console.log('Tokens created successfully');

    res.json({
      token,
      refreshToken,
      isAdmin: user.isAdmin,
      preferredManufacturers: user.isAdmin ? null : user.preferredManufacturers.map(m => m.name)
    });
  } catch (err) {
    console.error('Login error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ msg: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.user.id);

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const payload = {
      user: {
        id: user.id,
        isAdmin: user.isAdmin
      }
    };

    const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token: newToken
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(403).json({ msg: 'Invalid refresh token' });
  }
});

router.get('/user/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;