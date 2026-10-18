import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import MenuItem from '../models/MenuItem.js';
import razorpay, { isRazorpayConfigured } from '../config/razorpay.js';
import crypto from 'crypto';

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// POST /api/orders/create-razorpay-order
export const createRazorpayOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(400).json({
        message: 'Razorpay keys are not configured in backend/.env. Please use Cash on Delivery (COD).',
      });
    }

    const { amount } = req.body;
    const options = {
      amount: Math.max(100, Math.round(Number(amount) * 100)),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };
    const rzpOrder = await razorpay.orders.create(options);
    return res.json({
      ...rzpOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/orders (Supports ordering from 1 or multiple restaurants in the same order)
export const createOrder = async (req, res) => {
  try {
    const {
      shopId,
      items,
      totalAmount,
      deliveryAddress,
      customerLocation,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Resolve shopId for each item so multi-restaurant orders work seamlessly
    const enrichedItems = [];
    const shopIdSet = new Set();

    for (const item of items) {
      let itemShopId = item.shopId || item.shop;
      let itemShopName = item.shopName || '';

      if (!itemShopId && item.menuItem) {
        const dbItem = await MenuItem.findById(item.menuItem).populate('shop', 'name').lean();
        if (dbItem?.shop) {
          itemShopId = dbItem.shop._id || dbItem.shop;
          itemShopName = dbItem.shop.name || '';
        }
      }

      if (itemShopId) {
        shopIdSet.add(itemShopId.toString());
      }

      enrichedItems.push({
        menuItem: item.menuItem,
        shop: itemShopId || undefined,
        shopName: itemShopName,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity || 1),
        image: item.image || '',
        isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
      });
    }

    if (shopId) {
      shopIdSet.add(shopId.toString());
    }

    if (shopIdSet.size === 0) {
      const fallbackShop = await Shop.findOne().lean();
      if (fallbackShop) {
        shopIdSet.add(fallbackShop._id.toString());
      }
    }

    const uniqueShopIds = Array.from(shopIdSet);
    if (uniqueShopIds.length === 0) {
      return res.status(400).json({ message: 'No restaurant found for this order' });
    }

    if (razorpayOrderId && razorpayPaymentId && razorpaySignature && isRazorpayConfigured()) {
      const body = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    const customerOtp = generateOTP();
    const calculatedTotal =
      totalAmount !== undefined
        ? Number(totalAmount)
        : enrichedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const order = await Order.create({
      customer: req.user._id,
      shop: uniqueShopIds[0],
      shops: uniqueShopIds,
      items: enrichedItems,
      totalAmount: calculatedTotal,
      deliveryAddress: deliveryAddress || 'Customer Address',
      customerLocation: {
        lat: Number(customerLocation?.lat) || 28.625,
        lng: Number(customerLocation?.lng) || 77.215,
      },
      status: 'pending',
      paymentMethod: paymentMethod || (razorpayPaymentId ? 'ONLINE' : 'COD'),
      paymentStatus: razorpayPaymentId ? 'paid' : 'pending',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      customerOtp,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone');

    return res.status(201).json({ ...populatedOrder.toObject(), order: populatedOrder });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone');

    if (!order) return res.status(404).json({ message: 'Order not found' });
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/my-orders
export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/owner-orders
export const getOwnerOrders = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (!shop) return res.json([]);

    const orders = await Order.find({
      $or: [{ shop: shop._id }, { shops: shop._id }, { 'items.shop': shop._id }],
    })
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });

    const sanitized = orders.map((o) => {
      const obj = o.toObject();
      delete obj.riderOtp;
      delete obj.customerOtp;
      return obj;
    });
    return res.json(sanitized);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/status
export const updateOrderStatusByOwner = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'preparing', 'ready', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Use OTP verification for Out for Delivery.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/accept-delivery
export const acceptDeliveryByRider = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('shop', 'location');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.rider && order.rider.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Already accepted by another rider' });
    }

    order.rider = req.user._id;
    if (!order.riderOtp) {
      order.riderOtp = generateOTP();
    }
    if (!order.riderLocation?.lat) {
      order.riderLocation = {
        lat: (order.shop?.location?.lat || 28.6139) + 0.002,
        lng: (order.shop?.location?.lng || 77.209) + 0.002,
      };
    }
    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/rider-location
export const updateRiderLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.riderLocation = {
      lat: Number(lat),
      lng: Number(lng),
    };
    await order.save();
    return res.json({ message: 'Rider location updated', riderLocation: order.riderLocation });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/verify-pickup-otp
export const verifyPickupOtpByOwner = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id).populate('shop', 'location');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.rider) return res.status(400).json({ message: 'No rider assigned yet.' });
    if (!otp || order.riderOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid Pickup OTP.' });
    }

    order.status = 'out for delivery';
    order.riderLocation = {
      lat: order.shop?.location?.lat || 28.6139,
      lng: order.shop?.location?.lng || 77.209,
    };
    await order.save();
    return res.json({ message: 'Order is Out for Delivery.', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/verify-delivery-otp
export const verifyDeliveryOtpByRider = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!otp || order.customerOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid Customer Delivery OTP.' });
    }

    order.status = 'delivered';
    order.paymentStatus = 'paid';
    if (order.customerLocation?.lat) {
      order.riderLocation = {
        lat: order.customerLocation.lat,
        lng: order.customerLocation.lng,
      };
    }
    await order.save();
    return res.json({ message: 'Order Delivered.', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/rider/available
export const getRiderOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: { $in: ['preparing', 'ready'] }, rider: null },
        { rider: req.user._id },
      ],
    })
      .populate('customer', 'name phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .sort({ createdAt: -1 });

    const sanitized = orders.map((o) => {
      const obj = o.toObject();
      delete obj.customerOtp;
      return obj;
    });
    return res.json(sanitized);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};