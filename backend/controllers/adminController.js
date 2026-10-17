import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';

// GET /api/admin/pending-vendors
export const getPendingVendors = async (req, res) => {
  try {
    // Fetch all shops/vendors. You can add { isApproved: false } if you add that field to your Shop model later
    const pendingVendors = await Shop.find().populate('owner', 'name email phone');
    res.json(pendingVendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/vendor-status/:id
export const updateVendorStatus = async (req, res) => {
  try {
    const { status } = req.body; // e.g., 'approved' or 'rejected'
    const shop = await Shop.findById(req.params.id);
    
    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' });
    }

    // If you decide to add an 'isApproved' or 'status' field to the Shop model later, you update it here:
    // shop.status = status;
    // await shop.save();

    res.json({ message: `Vendor status updated to ${status}`, shop });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/stats
export const getDashboardStats = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    const shops = await Shop.find().populate('owner', 'name email');
    const orders = await Order.find()
      .populate('customer', 'name email')
      .populate('shop', 'name')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ users, shops, orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/init (Utility to create the first admin)
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existingAdmin = await User.findOne({ email });
    
    if (existingAdmin) {
      existingAdmin.role = 'admin';
      if (password) existingAdmin.password = password;
      await existingAdmin.save();
      return res.json({ message: 'Existing user promoted to Admin', admin: existingAdmin });
    }

    const admin = await User.create({
      name: name || 'FoodExpress Admin',
      email: email || 'admin@foodexpress.com',
      password: password || 'Admin@123',
      phone: phone || '9999999999',
      role: 'admin',
    });

    res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};