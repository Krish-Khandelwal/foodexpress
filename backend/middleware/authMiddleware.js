import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no access token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'Not authorized, invalid access token' });
  }

  try {
    const secret =
      process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret_foodexpress';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Access token verification failed:', error.message);
    return res.status(401).json({ message: 'Not authorized, access token expired or failed' });
  }
};

export const restrictTo = (...roles) => {
  const normalizedRoles = roles.map((r) => r.toLowerCase());
  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    if (!req.user || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Role (${req.user?.role || 'unknown'}) is not allowed to access this resource`,
      });
    }
    return next();
  };
};