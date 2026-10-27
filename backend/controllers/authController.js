import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

const getCookieOptions = (maxAgeMs) => {
  const isSecure = process.env.CORS_ORIGIN.startsWith('https://');
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: maxAgeMs,
  };
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, getCookieOptions(24 * 60 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const clearAuthCookies = (res) => {
  const isSecure = process.env.CORS_ORIGIN.startsWith('https://');
  const options = {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
  };
  res.clearCookie('accessToken', options);
  res.clearCookie('refreshToken', options);
};

const generateAccessAndRefreshTokens = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const normalizeUserRole = (role) => {
  const r = (role || 'customer').toLowerCase().trim();
  if (['owner', 'vendor', 'restaurant'].includes(r)) return 'owner';
  if (['rider', 'delivery', 'delivery_boy'].includes(r)) return 'rider';
  return 'customer';
};

// GET /api/auth/me
export const getCurrentUser = async (req, res) => {
  try {
    let shop = null;
    if (req.user.role === 'owner') {
      shop = await Shop.findOne({ owner: req.user._id }).lean();
    }

    return res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/register
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      shopName,
      shopAddress,
      shopPhone,
      shopDescription,
      shopCuisine,
      shopLocation,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: normalizedEmail }).lean();
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const normalizedRole = normalizeUserRole(role);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      phone: phone || '',
      role: normalizedRole,
    });

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.create({
        name: shopName || `${user.name}'s Restaurant`,
        address: shopAddress || 'Connaught Place, New Delhi',
        phone: shopPhone || phone || '',
        description: shopDescription || '',
        cuisine: shopCuisine || 'Multi-Cuisine',
        location: {
          lat: Number(shopLocation?.lat) || 28.6139,
          lng: Number(shopLocation?.lng) || 77.209,
        },
        owner: user._id,
        status: 'pending',
        isOpen: false,
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id }).lean();
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/google
export const googleAuth = async (req, res) => {
  try {
    let { name, email, phone, access_token } = req.body;

    if (!email && access_token) {
      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!googleRes.ok) {
        return res.status(401).json({ message: 'Failed to verify Google access token' });
      }
      const profile = await googleRes.json();
      email = profile.email;
      name = name || profile.name || profile.given_name;
    }

    if (!email) {
      return res.status(400).json({ message: 'Email is required for Google login' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: (name || normalizedEmail.split('@')[0]).trim(),
        email: normalizedEmail,
        phone: phone || '',
        password: Math.random().toString(36).slice(-10) + 'A1!',
        role: 'customer',
      });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id }).lean();
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/refresh-token
export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({ message: 'Refresh token cookie is required' });
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== incomingRefreshToken) {
      clearAuthCookies(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// POST /api/auth/logout
export const logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { $set: { refreshToken: '' } });
    }
    clearAuthCookies(res);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    clearAuthCookies(res);
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/my-shop
export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    return res.json(shop);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/my-shop
export const upsertMyShop = async (req, res) => {
  try {
    const { name, address, phone, description, cuisine, isOpen, location } = req.body;
    let shop = await Shop.findOne({ owner: req.user._id });

    if (shop) {
      shop.name = name ?? shop.name;
      shop.address = address ?? shop.address;
      shop.phone = phone ?? shop.phone;
      shop.description = description ?? shop.description;
      shop.cuisine = cuisine ?? shop.cuisine;
      if (location?.lat && location?.lng) {
        shop.location = {
          lat: Number(location.lat),
          lng: Number(location.lng),
        };
      }
      if (typeof isOpen === 'boolean' && shop.status === 'approved') {
        shop.isOpen = isOpen;
      }
      await shop.save();
    } else {
      shop = await Shop.create({
        name: name || 'My Restaurant',
        address: address || 'Main Street',
        phone: phone || req.user.phone || '',
        description: description || '',
        cuisine: cuisine || 'Multi-Cuisine',
        location: {
          lat: Number(location?.lat) || 28.6139,
          lng: Number(location?.lng) || 77.209,
        },
        owner: req.user._id,
        status: 'pending',
        isOpen: false,
      });
    }

    return res.json({ message: 'Restaurant details saved', shop });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/profile
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    if (req.body.phone !== undefined) {
      user.phone = req.body.phone;
    }

    await user.save();

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id }).lean();
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};