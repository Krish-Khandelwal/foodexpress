import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Shop from '../models/Shop.js';

const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_foodexpress';
  return jwt.sign({ id, role }, secret, { expiresIn: '7d' });
};

// POST /api/auth/register (Public signup strictly forbids 'admin' role)
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

    // Security: Only allow customer, owner, or rider on public registration
    const normalizedRole = ['customer', 'owner', 'rider'].includes(role?.toLowerCase())
      ? role.toLowerCase()
      : 'customer';

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

    return res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login (Authenticates against MongoDB, including seeded Admin)
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id }).select('-image').lean();
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/google
export const googleAuth = async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required for Google login' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        name: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password: Math.random().toString(36).slice(-10),
        role: 'customer',
      });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id }).select('-image').lean();
    }

    return res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/my-shop
export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).select('-image').lean();
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