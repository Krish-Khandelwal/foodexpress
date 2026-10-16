import Shop from '../models/Shop.js';
import MenuItem from '../models/MenuItem.js';
import { uploadImage } from '../config/cloudinary.js';

// Helper to get or create a shop for an owner
const getOrCreateOwnerShop = async (user) => {
  let shop = await Shop.findOne({ ownerId: user._id });
  if (!shop) {
    shop = await Shop.create({
      ownerId: user._id,
      shopName: `${user.name || 'My'}'s Kitchen`,
      address: 'Main Market, Food Street',
      location: { lat: 28.6139, lng: 77.2090 },
      approvalStatus: 'APPROVED',
      isOpen: true
    });
  }
  return shop;
};

// For Customers: Only fetch shops approved by Admins
export const getApprovedShops = async (req, res) => {
  try {
    const shops = await Shop.find({ approvalStatus: 'APPROVED', isOpen: true })
                            .select('shopName address imageUrl');
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// For Customers: Fetch the menu for a specific shop
export const getShopMenu = async (req, res) => {
  try {
    const menu = await MenuItem.find({ 
      shopId: req.params.shopId, 
      isAvailable: true 
    });
    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// For Restaurant Owners: Fetch owner's shop and menu items
export const getOwnerMenu = async (req, res) => {
  try {
    const shop = await getOrCreateOwnerShop(req.user);
    const items = await MenuItem.find({ shopId: shop._id }).sort({ createdAt: -1 });
    res.json({ shop, items });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// For Restaurant Owners: Create a new food item with Cloudinary image upload
export const createMenuItem = async (req, res) => {
  try {
    const { name, price, category, imageData, imageUrl, description } = req.body;
    if (!name || !price) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    // Upload image to Cloudinary if base64 data is provided
    let finalImageUrl = '';
    if (imageData && imageData.startsWith('data:image')) {
      // imageData is a base64 Data URL from the frontend file picker
      finalImageUrl = await uploadImage(imageData);
      console.log('Image uploaded to Cloudinary:', finalImageUrl);
    } else if (imageUrl) {
      // Plain URL provided (e.g. pasted by user)
      finalImageUrl = imageUrl;
    }

    const shop = await getOrCreateOwnerShop(req.user);
    const newItem = await MenuItem.create({
      shopId: shop._id,
      name: name.trim(),
      price: Number(price),
      category: category || 'VEG',
      imageUrl: finalImageUrl,
      description: description ? description.trim() : '',
      isAvailable: true
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ message: error.message });
  }
};

// For Restaurant Owners: Delete a menu item
export const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const shop = await Shop.findOne({ _id: item.shopId, ownerId: req.user._id });
    if (!shop) {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted successfully', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// For Restaurant Owners: Toggle availability (in stock / out of stock)
export const toggleMenuItemAvailability = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const shop = await Shop.findOne({ _id: item.shopId, ownerId: req.user._id });
    if (!shop) {
      return res.status(403).json({ message: 'Not authorized to modify this item' });
    }

    item.isAvailable = !item.isAvailable;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};