import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Shop from '../models/Shop.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
      // Restaurant fields during owner signup
      shopName,
      shopAddress,
      shopPhone,
      shopDescription,
      shopCuisine,
      shopImage,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role || 'customer',
    });

    let shop = null;
    if (user.role === 'owner' && shopName) {
      let uploadedShopImg = '';
      if (shopImage) {
        uploadedShopImg = await uploadToCloudinary(shopImage);
      }
      shop = await Shop.create({
        name: shopName,
        address: shopAddress || 'Main Street',
        phone: shopPhone || phone || '',
        description: shopDescription || '',
        cuisine: shopCuisine || 'Multi-Cuisine',
        image: uploadedShopImg,
        owner: user._id,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/google
export const googleAuth = async (req, res) => {
  try {
    const { name, email, photo } = req.body;
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).slice(-8), // random password for google users
        role: 'customer'
      });
    }

    let shop = null;
    if (user.role === 'owner') {
      shop = await Shop.findOne({ owner: user._id });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      shop,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/my-shop
export const getMyShop = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/my-shop
export const upsertMyShop = async (req, res) => {
  try {
    const { name, address, phone, description, cuisine, image, isOpen } = req.body;
    let shop = await Shop.findOne({ owner: req.user.id });

    let uploadedImg = shop ? shop.image : '';
    if (image && image !== uploadedImg) {
      uploadedImg = await uploadToCloudinary(image);
    }

    if (shop) {
      shop.name = name ?? shop.name;
      shop.address = address ?? shop.address;
      shop.phone = phone ?? shop.phone;
      shop.description = description ?? shop.description;
      shop.cuisine = cuisine ?? shop.cuisine;
      shop.image = uploadedImg;
      if (typeof isOpen === 'boolean') shop.isOpen = isOpen;
      await shop.save();
    } else {
      shop = await Shop.create({
        name: name || 'My Restaurant',
        address: address || '',
        phone: phone || '',
        description: description || '',
        cuisine: cuisine || 'Multi-Cuisine',
        image: uploadedImg,
        owner: req.user.id,
      });
    }

    res.json({ message: 'Restaurant details saved', shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};