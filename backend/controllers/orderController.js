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
      amount: Math.max(100, Math.round(Number(amount) * 100)), // in paise
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

// POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const {
      shopId,
      items,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Resolve shopId from payload, first item, or MenuItem lookup
    let resolvedShopId = shopId || items[0]?.shopId || items[0]?.shop;
    if (!resolvedShopId && items[0]?.menuItem) {
      const foundItem = await MenuItem.findById(items[0].menuItem);
      resolvedShopId = foundItem?.shop;
    }

    if (!resolvedShopId) {
      const fallbackShop = await Shop.findOne();
      resolvedShopId = fallbackShop?._id;
    }

    if (!resolvedShopId) {
      return res.status(400).json({ message: 'Restaurant (shopId) could not be determined for this order' });
    }

    // Verify signature if paid via Razorpay
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
        : items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);

    const order = await Order.create({
      customer: req.user._id,
      shop: resolvedShopId,
      items: items.map((i) => ({
        menuItem: i.menuItem,
        name: i.name,
        price: Number(i.price),
        quantity: Number(i.quantity || 1),
        image: i.image || '',
      })),
      totalAmount: calculatedTotal,
      deliveryAddress: deliveryAddress || 'Customer Address',
      status: 'pending',
      paymentMethod: paymentMethod || (razorpayPaymentId ? 'ONLINE' : 'COD'),
      paymentStatus: razorpayPaymentId ? 'paid' : 'pending',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      customerOtp,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone')
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
      .populate('shop', 'name address phone')
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
      .populate('shop', 'name address phone image')
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
    const shop = await Shop.findOne({ owner: req.user._id });
    if (!shop) return res.json([]);

    const orders = await Order.find({ shop: shop._id })
      .populate('customer', 'name email phone')
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
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.rider && order.rider.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Already accepted by another rider' });
    }

    order.rider = req.user._id;
    if (!order.riderOtp) {
      order.riderOtp = generateOTP();
    }
    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/verify-pickup-otp
export const verifyPickupOtpByOwner = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.rider) return res.status(400).json({ message: 'No rider assigned yet.' });
    if (!otp || order.riderOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid Pickup OTP.' });
    }

    order.status = 'out for delivery';
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
      .populate('shop', 'name address phone')
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