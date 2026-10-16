import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. PROTECT: Verifies if the user is logged in
export const protect = async (req, res, next) => {
  let token;

  // Check if token exists in the Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(' ')[1];

      // Verify token using the secret key from .env
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the user in the database and attach it to the request object (excluding the password)
      req.user = await User.findById(decoded.id).select('-password');

      next(); // Move to the next function (the actual controller)
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// 2. RESTRICT TO: Checks if the logged-in user has the correct role
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user is set by the `protect` middleware above
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role (${req.user?.role}) is not allowed to access this resource` 
      });
    }
    next();
  };
};