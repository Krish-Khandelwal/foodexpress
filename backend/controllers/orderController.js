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

// POST /api/orders (Enforces ordering from 1 restaurant at a time)
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

    const enrichedItems = [];
    const shopIdSet = new Set();

    for (const item of items) {
      let itemShopId = item.shopId || item.shop?._id || item.shop;
      let itemShopName = item.shopName || item.shop?.name || '';

      if (!itemShopId && (item.menuItem || item._id)) {
        const dbItem = await MenuItem.findById(item.menuItem || item._id)
          .populate('shop', 'name')
          .lean();
        if (dbItem?.shop) {
          itemShopId = dbItem.shop._id || dbItem.shop;
          itemShopName = dbItem.shop.name || '';
        }
      }

      if (itemShopId) {
        shopIdSet.add(itemShopId.toString());
      }

      enrichedItems.push({
        menuItem: item.menuItem || item._id,
        shop: itemShopId || undefined,
        shopName: itemShopName,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity || 1),
        image: item.image || item.imageUrl || '',
        isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
      });
    }

    if (shopId && shopIdSet.size === 0) {
      shopIdSet.add(shopId.toString());
    }

    if (shopIdSet.size > 1) {
      return res.status(400).json({
        message: 'You can only order food from 1 restaurant at a time!',
      });
    }

    if (shopIdSet.size === 0) {
      const fallbackShop = await Shop.findOne({ status: 'approved' }).lean();
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
    const riderOtp = generateOTP();
    const calculatedTotal =
      totalAmount !== undefined
        ? Number(totalAmount)
        : enrichedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const formattedAddress =
      typeof deliveryAddress === 'object'
        ? deliveryAddress.street || 'Customer Address'
        : deliveryAddress || 'Customer Address';

    const order = await Order.create({
      customer: req.user._id,
      shop: uniqueShopIds[0],
      shops: uniqueShopIds,
      items: enrichedItems,
      totalAmount: calculatedTotal,
      deliveryAddress: formattedAddress,
      customerLocation: {
        lat: Number(customerLocation?.lat ?? deliveryAddress?.lat) || 28.6139,
        lng: Number(customerLocation?.lng ?? deliveryAddress?.lng) || 77.209,
      },
      status: 'pending',
      paymentMethod: paymentMethod || (razorpayPaymentId ? 'ONLINE' : 'COD'),
      paymentStatus: razorpayPaymentId ? 'paid' : 'pending',
      razorpayOrderId: razorpayOrderId || '',
      razorpayPaymentId: razorpayPaymentId || '',
      riderOtp,
      customerOtp,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location rating numReviews')
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
      .populate('shop', 'name address phone location rating numReviews')
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
      .populate('shop', 'name address phone location rating numReviews')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/owner-orders (Includes riderOtp so Restaurant Owner can see Pickup Code)
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
      // Keep obj.riderOtp for Restaurant Owner screen; hide customerOtp
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
    if (status === 'ready' && !order.riderOtp) {
      order.riderOtp = generateOTP();
    }
    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/cancel (Customer cancels order)
export const cancelOrderByCustomer = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('rider', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (
      order.customer._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    order.status = 'cancelled';
    order.cancelReason = req.body?.reason || 'Cancelled by customer';
    await order.save();

    return res.json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// POST /api/orders/:id/rate (Customer rates food quality)
export const rateOrderByCustomer = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const numericRating = Number(rating);

    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Please provide a valid rating between 1 and 5' });
    }

    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location rating numReviews')
      .populate('rider', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to rate this order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Cancelled orders cannot be rated' });
    }

    order.rating = numericRating;
    order.review = (review || '').trim();
    order.ratedAt = new Date();
    await order.save();

    if (order.shop?._id) {
      const ratedOrders = await Order.find({
        shop: order.shop._id,
        rating: { $ne: null },
      }).select('rating');

      if (ratedOrders.length > 0) {
        const avg =
          ratedOrders.reduce((acc, cur) => acc + Number(cur.rating), 0) / ratedOrders.length;
        await Shop.findByIdAndUpdate(order.shop._id, {
          rating: Number(avg.toFixed(1)),
          numReviews: ratedOrders.length,
        });
      }
    }

    for (const item of order.items) {
      if (item.menuItem) {
        const menuDoc = await MenuItem.findById(item.menuItem);
        if (menuDoc) {
          const prevCount = menuDoc.numReviews || 0;
          const prevRating = menuDoc.rating || 0;
          const newCount = prevCount + 1;
          const newAvg = (prevRating * prevCount + numericRating) / newCount;
          menuDoc.rating = Number(newAvg.toFixed(1));
          menuDoc.numReviews = newCount;
          await menuDoc.save();
        }
      }
    }

    return res.json({ message: 'Thank you for rating the food quality!', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/accept-delivery (Only allowed when order status is 'ready')
export const acceptDeliveryByRider = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('shop', 'location');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.status !== 'ready') {
      return res.status(400).json({
        message: 'Delivery can only be accepted after the Restaurant Owner marks the order Ready.',
      });
    }

    if (order.rider && order.rider.toString() !== req.user._id.toString()) {
      return res.status(400).json({ message: 'Already accepted by another rider' });
    }

    order.rider = req.user._id;
    if (!order.riderOtp) {
      order.riderOtp = generateOTP();
    }

    const { lat, lng } = req.body || {};
    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      order.riderLocation = {
        lat: Number(lat),
        lng: Number(lng),
      };
    } else if (!order.riderLocation?.lat) {
      order.riderLocation = {
        lat: (order.shop?.location?.lat || 28.6139) + 0.004,
        lng: (order.shop?.location?.lng || 77.209) + 0.004,
      };
    }

    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone');

    const sanitized = populated.toObject();
    delete sanitized.riderOtp;
    delete sanitized.customerOtp;

    return res.json(sanitized);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/rider-location
export const updateRiderLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

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
    const { otp, lat, lng } = req.body;
    const order = await Order.findById(req.params.id).populate('shop', 'location');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.rider) return res.status(400).json({ message: 'No rider assigned yet.' });
    if (!otp || order.riderOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid Pickup Code.' });
    }

    order.status = 'out for delivery';
    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      order.riderLocation = {
        lat: Number(lat),
        lng: Number(lng),
      };
    } else {
      order.riderLocation = {
        lat: order.shop?.location?.lat || 28.6139,
        lng: order.shop?.location?.lng || 77.209,
      };
    }
    await order.save();

    const populated = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone');

    return res.json({
      message: 'Pickup code verified! Showing path to customer location.',
      order: populated,
    });
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

// GET /api/orders/rider/available (Only shows unassigned orders when status === 'ready')
export const getRiderOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [
        { status: 'ready', rider: null },
        { rider: req.user._id },
      ],
    })
      .populate('customer', 'name phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .sort({ createdAt: -1 });

    // Hide both riderOtp and customerOtp from Rider screen response
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