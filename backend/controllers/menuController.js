import MenuItem from '../models/MenuItem.js';
import Shop from '../models/Shop.js';
import Category from '../models/Category.js';
import { ensureDefaultCategories } from './adminController.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Helper function to convert string 'true'/'false' from FormData into actual boolean
const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return String(value).toLowerCase() === 'true';
};

// 1. Get All Food Categories
// Route: GET /api/menu/categories
export const getMenuCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find().sort({ name: 1 }).lean();
    return res.status(200).json(categories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Create New Dish (Uploads Device Image to Cloudinary)
// Route: POST /api/menu
export const createMenuItem = async (req, res) => {
  try {
    // Step 1: Extract fields from request body
    const { name, description, price, category, image, isVeg, isAvailable } = req.body;

    // Step 2: Validate required fields
    if (!name || price === undefined || price === '') {
      return res.status(400).json({ message: 'Food name and price are required.' });
    }

    // Step 3: Find or create the Restaurant Owner's shop
    let shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      shop = await Shop.create({
        name: `${req.user.name}'s Restaurant`,
        address: 'Main Street',
        phone: req.user.phone || '',
        owner: req.user._id,
        status: 'pending',
        isOpen: false,
      });
    }

    // Step 4: Upload image file from device to Cloudinary
    let imageUrl = '';
    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      imageUrl = await uploadToCloudinary(dataURI);
    } else if (image) {
      imageUrl = await uploadToCloudinary(image);
    }

    // Step 5: Save dish in MongoDB
    const menuItem = await MenuItem.create({
      name: name.trim(),
      description: description || '',
      price: Number(price),
      category: category || 'Main Course',
      image: imageUrl,
      imageUrl: imageUrl,
      isVeg: parseBoolean(isVeg, true),
      isAvailable: parseBoolean(isAvailable, true),
      shop: shop._id,
    });

    return res.status(201).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Update Existing Dish Details (Verifies Shop Ownership)
// Route: PUT /api/menu/:id
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image, isVeg, isAvailable } = req.body;

    // Step 1: Find the dish in the database
    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    // Step 2: Verify that this dish belongs to the logged-in owner's shop
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (shop && menuItem.shop.toString() !== shop._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this dish' });
    }

    // Step 3: If a new image file was picked, upload it to Cloudinary
    let updatedImageUrl = menuItem.image;
    if (req.file) {
      const base64Image = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${base64Image}`;
      updatedImageUrl = await uploadToCloudinary(dataURI);
    } else if (image !== undefined && image !== menuItem.image) {
      updatedImageUrl = image ? await uploadToCloudinary(image) : menuItem.image;
    }

    // Step 4: Update fields
    if (name !== undefined) menuItem.name = name.trim();
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined && price !== '') menuItem.price = Number(price);
    if (category !== undefined) menuItem.category = category;

    menuItem.image = updatedImageUrl;
    menuItem.imageUrl = updatedImageUrl;

    if (isVeg !== undefined) {
      menuItem.isVeg = parseBoolean(isVeg, menuItem.isVeg);
    }
    if (isAvailable !== undefined) {
      menuItem.isAvailable = parseBoolean(isAvailable, menuItem.isAvailable);
    }

    await menuItem.save();
    return res.status(200).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Toggle Dish Availability (Verifies Shop Ownership)
// Route: PATCH /api/menu/:id/toggle
export const toggleMenuItemAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (shop && menuItem.shop.toString() !== shop._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to modify this dish' });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    return res.status(200).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Delete Dish (Verifies Shop Ownership)
// Route: DELETE /api/menu/:id
export const deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (shop && menuItem.shop.toString() !== shop._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this dish' });
    }

    await menuItem.deleteOne();
    return res.status(200).json({ message: 'Food item deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 6. Get Logged-In Owner's Menu
// Route: GET /api/menu/my-menu
export const getOwnerMenu = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (!shop) {
      return res.status(200).json([]);
    }

    const items = await MenuItem.find({ shop: shop._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 7. Get All Public Menu Items (Only from Approved & Open Restaurants)
// Route: GET /api/menu
export const getAllMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ isAvailable: true })
      .populate('shop', 'name address isOpen status cuisine location rating numReviews')
      .sort({ createdAt: -1 })
      .lean();

    const visibleItems = items.filter(
      (item) => item.shop?.status === 'approved' && item.shop?.isOpen !== false
    );
    return res.status(200).json(visibleItems);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 8. Get All Approved Restaurants
// Route: GET /api/menu/shops
export const getApprovedShops = async (req, res) => {
  try {
    const shops = await Shop.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(shops);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 9. Get Menu of a Specific Restaurant
// Route: GET /api/menu/shops/:shopId/menu
export const getShopMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({
      shop: req.params.shopId,
      isAvailable: true,
    })
      .populate('shop', 'name address isOpen status location rating numReviews')
      .lean();

    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};