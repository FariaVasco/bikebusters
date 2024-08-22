const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  console.log('Auth middleware triggered');
  console.log('Headers:', req.headers);

  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    console.log('No Authorization header found');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  console.log('Authorization header:', authHeader);

  if (!authHeader.startsWith('Bearer ')) {
    console.log('Invalid token format: Bearer prefix missing');
    return res.status(401).json({ msg: 'Invalid token format' });
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' from the header

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    // Ensure that req.user includes the _id field
    req.user = {
      _id: decoded.user.id, // Assuming the user id is stored in decoded.user.id
      ...decoded.user
    };
    
    console.log('User set in request:', req.user);
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token has expired' });
    }
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

module.exports = auth;