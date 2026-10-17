import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import razorpay from '../config/razorpay.js';
import crypto from 'crypto';

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// POST /api/orders/create-razorpay-order
export const createRazorpayOrder = async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID) {
      return res.status(400).json({ message: 'Razorpay keys not configured in .env' });
    }
    const { amount } = req.body;
    const options = {
      amount: Math.round(Number(amount) * 100), // in paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };
    const rzpOrder = await razorpay.orders.create(options);
    res.json(rzpOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const { shopId, items, totalAmount, deliveryAddress, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // Optional signature check if paid via Razorpay
    if (razorpayOrderId && razorpayPaymentId && razorpaySignature && process.env.RAZORPAY_KEY_SECRET) {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    const customerOtp = generateOTP();

    const order = await Order.create({
      customer: req.user.id,
      shop: shopId,
      items,
      totalAmount,
      deliveryAddress: deliveryAddress || 'Customer Address',
      status: 'pending',
      paymentStatus: 'paid',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      customerOtp,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone')
      .populate('rider', 'name phone');

    res.status(201).json({ ...populatedOrder.toObject(), order: populatedOrder });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/my-orders
export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('shop', 'name address phone image')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/owner-orders
export const getOwnerOrders = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user.id });
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
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/status
export const updateOrderStatusByOwner = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'preparing', 'ready'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Use OTP verification for Out for Delivery.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/accept-delivery
export const acceptDeliveryByRider = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.rider && order.rider.toString() !== req.user.id) {
      return res.status(400).json({ message: 'Already accepted by another rider' });
    }

    order.rider = req.user.id;
    order.riderOtp = generateOTP();
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/verify-pickup-otp
export const verifyPickupOtpByOwner = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.rider) return res.status(400).json({ message: 'No rider assigned yet.' });
    if (!otp || order.riderOtp !== otp.trim()) return res.status(400).json({ message: 'Invalid OTP.' });

    order.status = 'out for delivery';
    await order.save();
    res.json({ message: 'Order is Out for Delivery.', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/verify-delivery-otp
export const verifyDeliveryOtpByRider = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!otp || order.customerOtp !== otp.trim()) return res.status(400).json({ message: 'Invalid OTP.' });

    order.status = 'delivered';
    await order.save();
    res.json({ message: 'Order Delivered.', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/rider/available
export const getRiderOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ status: { $in: ['preparing', 'ready'] }, rider: null }, { rider: req.user.id }],
    })
      .populate('customer', 'name phone')
      .populate('shop', 'name address phone')
      .sort({ createdAt: -1 });

    const sanitized = orders.map((o) => {
      const obj = o.toObject();
      delete obj.customerOtp;
      return obj;
    });
    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};