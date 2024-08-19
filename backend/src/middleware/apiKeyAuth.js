const config = require('../config/config');

module.exports = (req, res, next) => {
  const apiKey = req.get('X-API-Key');
  if (!apiKey || apiKey !== config.apiKey) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  next();
};