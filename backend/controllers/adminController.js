import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';

// GET /api/admin/pending-vendors
export const getPendingVendors = async (req, res) => {
  try {
    const vendors = await Shop.find()
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
    return res.json(vendors);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/vendor-status/:id
export const updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'
    const normalizedStatus = (status || 'approved').toLowerCase();

    if (!['pending', 'approved', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const shop = await Shop.findById(req.params.id).populate('owner', 'name email phone');
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    shop.status = normalizedStatus;
    shop.isOpen = normalizedStatus === 'approved';
    await shop.save();

    return res.json({ message: `Vendor status updated to ${normalizedStatus}`, shop });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/stats
export const getDashboardStats = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const shops = await Shop.find().populate('owner', 'name email phone').sort({ createdAt: -1 });
    const orders = await Order.find()
      .populate('customer', 'name email phone')
      .populate('shop', 'name')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({ users, shops, orders });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/init
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const targetEmail = (email || 'admin@foodexpress.com').toLowerCase().trim();
    const existingAdmin = await User.findOne({ email: targetEmail });

    if (existingAdmin) {
      existingAdmin.role = 'admin';
      if (password) existingAdmin.password = password;
      await existingAdmin.save();
      return res.json({ message: 'Existing user promoted to Admin', admin: existingAdmin });
    }

    const admin = await User.create({
      name: name || 'FoodExpress Admin',
      email: targetEmail,
      password: password || 'Admin@123',
      phone: phone || '9999999999',
      role: 'admin',
    });

    return res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};