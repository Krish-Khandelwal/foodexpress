import MenuItem from '../models/MenuItem.js';
import Shop from '../models/Shop.js';
import Category from '../models/Category.js';
import { ensureDefaultCategories } from './adminController.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// GET /api/menu/categories
export const getMenuCategories = async (req, res) => {
  try {
    await ensureDefaultCategories();
    const categories = await Category.find().sort({ name: 1 });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/menu
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, image, isVeg, isAvailable } = req.body;

    if (!name || price === undefined || price === '') {
      return res.status(400).json({ message: 'Food name and price are required.' });
    }

    let shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) {
      shop = await Shop.create({
        name: `${req.user.name}'s Restaurant`,
        address: 'Main Street',
        phone: req.user.phone || '',
        owner: req.user._id,
        status: 'approved',
      });
    }

    let imageUrl = '';
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      imageUrl = await uploadToCloudinary(dataURI);
    } else if (image) {
      imageUrl = await uploadToCloudinary(image);
    }

    const menuItem = await MenuItem.create({
      name: name.trim(),
      description: description || '',
      price: Number(price),
      category: category || 'Main Course',
      image: imageUrl,
      imageUrl: imageUrl,
      isVeg: isVeg !== undefined ? Boolean(isVeg) : true,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      shop: shop._id,
    });

    return res.status(201).json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/menu/:id
export const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category, image, isVeg, isAvailable } = req.body;

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }

    let updatedImageUrl = menuItem.image;
    if (req.file) {
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      updatedImageUrl = await uploadToCloudinary(dataURI);
    } else if (image !== undefined && image !== menuItem.image) {
      updatedImageUrl = image ? await uploadToCloudinary(image) : '';
    }

    menuItem.name = name ?? menuItem.name;
    menuItem.description = description ?? menuItem.description;
    if (price !== undefined && price !== '') menuItem.price = Number(price);
    menuItem.category = category ?? menuItem.category;
    menuItem.image = updatedImageUrl;
    menuItem.imageUrl = updatedImageUrl;
    if (isVeg !== undefined) menuItem.isVeg = Boolean(isVeg);
    if (isAvailable !== undefined) menuItem.isAvailable = Boolean(isAvailable);

    await menuItem.save();
    return res.json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PATCH /api/menu/:id/toggle
export const toggleMenuItemAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();
    return res.json(menuItem);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// DELETE /api/menu/:id
export const deleteMenuItem = async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    return res.json({ message: 'Food item deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/menu/my-menu
export const getOwnerMenu = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.json([]);
    const items = await MenuItem.find({ shop: shop._id }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/menu
export const getAllMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ isAvailable: true })
      .populate('shop', 'name address isOpen status cuisine location')
      .sort({ createdAt: -1 });

    const visibleItems = items.filter((item) => item.shop?.status !== 'rejected');
    return res.json(visibleItems);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/menu/shops
export const getApprovedShops = async (req, res) => {
  try {
    const shops = await Shop.find({ status: { $ne: 'rejected' } }).sort({ createdAt: -1 });
    return res.json(shops);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/menu/shops/:shopId/menu
export const getShopMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({
      shop: req.params.shopId,
      isAvailable: true,
    }).populate('shop', 'name address isOpen location');
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};