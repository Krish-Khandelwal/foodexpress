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

export const seedAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL.toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME;
    const adminPhone = process.env.ADMIN_PHONE;

    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'admin' }],
    });

    if (!existingAdmin) {
      await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        phone: adminPhone,
        role: 'admin',
      });
      console.log(`Admin seeded in database (${adminEmail})`);
      return;
    }

    let needsSave = false;

    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      needsSave = true;
    }

    if (existingAdmin.email !== adminEmail) {
      existingAdmin.email = adminEmail;
      needsSave = true;
    }

    const isPasswordSame = await existingAdmin.matchPassword(adminPassword);
    if (!isPasswordSame) {
      existingAdmin.password = adminPassword;
      needsSave = true;
    }

    if (needsSave) {
      await existingAdmin.save();
      console.log(`Admin credentials synced (${adminEmail})`);
    } else {
      console.log(`Admin account verified (${existingAdmin.email})`);
    }
  } catch (error) {
    console.error(`Admin seeding error: ${error.message}`);
  }
};

export const getCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const cleanName = name.trim();
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, 'i') },
    }).lean();

    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({ name: cleanName });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Category removed' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPendingVendors = async (req, res) => {
  try {
    const vendors = await Shop.find()
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();
    return res.json(vendors);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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

export const getDashboardStats = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const [users, shops, orders, categories] = await Promise.all([
      User.find().select('-password').sort({ createdAt: -1 }).lean(),
      Shop.find().populate('owner', 'name email phone').sort({ createdAt: -1 }).lean(),
      Order.find()
        .populate('customer', 'name email phone')
        .populate('shop', 'name')
        .populate('rider', 'name phone')
        .sort({ createdAt: -1 })
        .lean(),
      Category.find().sort({ name: 1 }).lean(),
    ]);

    return res.json({ users, shops, orders, categories });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};