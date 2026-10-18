import User from '../models/User.js';
import Shop from '../models/Shop.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

const DEFAULT_CATEGORIES = [
  'Starter',
  'Main Course',
  'Breads',
  'Rice & Biryani',
  'Chinese',
  'Burgers & Pizza',
  'Beverages',
  'Dessert',
];

export const ensureDefaultCategories = async () => {
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(
      DEFAULT_CATEGORIES.map((name) => ({ name })),
      { ordered: false }
    ).catch(() => {});
  }
};

// GET /api/admin/categories
export const getCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/categories
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const cleanName = name.trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name: cleanName });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/admin/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Category removed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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
    const { status } = req.body;
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
    await ensureDefaultCategories();
    const [users, shops, orders, categories] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }),
      Shop.find().populate('owner', 'name email phone').sort({ createdAt: -1 }),
      Order.find()
        .populate('customer', 'name email phone')
        .populate('shop', 'name')
        .populate('shops', 'name')
        .populate('rider', 'name phone')
        .sort({ createdAt: -1 }),
      Category.find().sort({ name: 1 }),
    ]);

    return res.json({ users, shops, orders, categories });
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