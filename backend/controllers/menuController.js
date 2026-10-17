import MenuItem from '../models/MenuItem.js';
import Shop from '../models/Shop.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// POST /api/menu
export const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, image, isVeg, isAvailable } = req.body;

    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) {
      return res.status(400).json({ message: 'Please create your restaurant profile first.' });
    }

    let imageUrl = '';
    if (req.file) {
      // If using multer file upload (buffer)
      const b64 = Buffer.from(req.file.buffer).toString('base64');
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      imageUrl = await uploadToCloudinary(dataURI);
    } else if (image) {
      // If sending base64 string from frontend
      imageUrl = await uploadToCloudinary(image);
    }

    const menuItem = await MenuItem.create({
      name,
      description,
      price: Number(price),
      category: category || 'Main Course',
      image: imageUrl,
      imageUrl: imageUrl, // Stored in both fields for frontend compatibility
      isVeg: isVeg !== undefined ? isVeg : true,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      shop: shop._id,
    });

    res.status(201).json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    } else if (image && image !== menuItem.image) {
      updatedImageUrl = await uploadToCloudinary(image);
    }

    menuItem.name = name ?? menuItem.name;
    menuItem.description = description ?? menuItem.description;
    if (price !== undefined) menuItem.price = Number(price);
    menuItem.category = category ?? menuItem.category;
    menuItem.image = updatedImageUrl;
    menuItem.imageUrl = updatedImageUrl;
    if (isVeg !== undefined) menuItem.isVeg = isVeg;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable;

    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/menu/:id
export const deleteMenuItem = async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Food item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/menu/my-menu
export const getOwnerMenu = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
    if (!shop) return res.json([]);
    const items = await MenuItem.find({ shop: shop._id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/menu
export const getAllMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ isAvailable: true }).populate('shop', 'name address image isOpen');
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};