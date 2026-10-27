import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import MenuItem from '../models/MenuItem.js';
import razorpay from '../config/razorpay.js';
import crypto from 'crypto';

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const amountInPaise = Math.max(100, Math.round(Number(amount) * 100));

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    const rzpOrder = await razorpay.orders.create(options);

    return res.status(200).json({
      ...rzpOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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

    const menuIds = items
      .map((item) => item.menuItem || item._id)
      .filter(Boolean);

    const dbMenuItems = await MenuItem.find({ _id: { $in: menuIds } })
      .populate('shop', 'name status isOpen')
      .lean();

    const menuMap = {};
    for (const dbItem of dbMenuItems) {
      menuMap[dbItem._id.toString()] = dbItem;
    }

    const enrichedItems = [];
    const shopIdSet = new Set();

    for (const item of items) {
      let itemShopId = item.shopId || item.shop?._id || item.shop;
      let itemShopName = item.shopName || item.shop?.name || '';

      const lookupId = (item.menuItem || item._id || '').toString();
      if (!itemShopId && menuMap[lookupId]?.shop) {
        itemShopId = menuMap[lookupId].shop._id || menuMap[lookupId].shop;
        itemShopName = menuMap[lookupId].shop.name || '';
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

    const uniqueShopIds = Array.from(shopIdSet);
    if (uniqueShopIds.length === 0) {
      return res.status(400).json({ message: 'No restaurant found for this order' });
    }

    const targetShop = await Shop.findById(uniqueShopIds[0]).lean();
    if (!targetShop || targetShop.status !== 'approved') {
      return res.status(400).json({ message: 'This restaurant is not currently approved for orders.' });
    }
    if (targetShop.isOpen === false) {
      return res.status(400).json({
        message: `"${targetShop.name}" is currently closed and not accepting orders.`,
      });
    }

    if (razorpayOrderId && razorpayPaymentId && razorpaySignature) {
      const signBody = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(signBody)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    const customerOtp = generateOTP();
    const riderOtp = generateOTP();

    let calculatedTotal = 0;
    if (totalAmount !== undefined) {
      calculatedTotal = Number(totalAmount);
    } else {
      for (const item of enrichedItems) {
        calculatedTotal += item.price * item.quantity;
      }
    }

    let formattedAddress = 'Customer Address';
    if (typeof deliveryAddress === 'object' && deliveryAddress !== null) {
      formattedAddress = deliveryAddress.street || 'Customer Address';
    } else if (deliveryAddress) {
      formattedAddress = deliveryAddress;
    }

    const order = await Order.create({
      customer: req.user._id,
      shop: uniqueShopIds[0],
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
      .populate('rider', 'name phone')
      .lean();

    return res.status(201).json({ ...populatedOrder, order: populatedOrder });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location rating numReviews')
      .populate('rider', 'name phone')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'name address phone location rating numReviews')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getOwnerOrders = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (!shop) {
      return res.status(200).json([]);
    }

    const orders = await Order.find({
      $or: [{ shop: shop._id }, { 'items.shop': shop._id }],
    })
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedOrders = orders.map((orderItem) => {
      const copy = { ...orderItem };
      delete copy.customerOtp;
      return copy;
    });

    return res.status(200).json(sanitizedOrders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateOrderStatusByOwner = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'preparing', 'ready', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Use OTP verification for Out for Delivery.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (['out for delivery', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot change status because order is already ${order.status}.`,
      });
    }

    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (shop && order.shop.toString() !== shop._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = status;

    if (status === 'ready' && !order.riderOtp) {
      order.riderOtp = generateOTP();
    }

    await order.save();
    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const cancelOrderByCustomer = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('rider', 'name phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isCustomerOwner = order.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isCustomerOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (!['pending', 'preparing'].includes(order.status) && !isAdmin) {
      return res.status(400).json({
        message: `Order cannot be cancelled once it is ${order.status}.`,
      });
    }

    order.status = 'cancelled';
    order.cancelReason = req.body?.reason || 'Cancelled by customer';
    await order.save();

    return res.status(200).json({ message: 'Order cancelled successfully', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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

    if (order.status !== 'delivered') {
      return res.status(400).json({
        message: 'You can rate food quality only after your order is delivered.',
      });
    }

    const isFirstTimeRating = !order.rating;

    order.rating = numericRating;
    order.review = (review || '').trim();
    order.ratedAt = new Date();
    await order.save();

    if (order.shop?._id) {
      const ratedOrders = await Order.find({
        shop: order.shop._id,
        rating: { $ne: null },
      })
        .select('rating')
        .lean();

      if (ratedOrders.length > 0) {
        const totalStars = ratedOrders.reduce((sum, ord) => sum + Number(ord.rating), 0);
        const averageRating = totalStars / ratedOrders.length;

        await Shop.findByIdAndUpdate(order.shop._id, {
          rating: Number(averageRating.toFixed(1)),
          numReviews: ratedOrders.length,
        });
      }
    }

    if (isFirstTimeRating) {
      const itemUpdates = order.items
        .filter((item) => item.menuItem)
        .map(async (item) => {
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
        });

      await Promise.all(itemUpdates);
    }

    return res.status(200).json({ message: 'Thank you for rating the food quality!', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const acceptDeliveryByRider = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('shop', 'location');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

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
      .populate('rider', 'name phone')
      .lean();

    delete populated.riderOtp;
    delete populated.customerOtp;

    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateRiderLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      {
        riderLocation: {
          lat: Number(lat),
          lng: Number(lng),
        },
      },
      { returnDocument: 'after' }
    ).lean();

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    return res.status(200).json({
      message: 'Rider location updated',
      riderLocation: updatedOrder.riderLocation,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyPickupOtpByOwner = async (req, res) => {
  try {
    const { otp, lat, lng } = req.body;
    const order = await Order.findById(req.params.id).populate('shop', 'location');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.rider) {
      return res.status(400).json({ message: 'No rider assigned yet.' });
    }

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
      .populate('rider', 'name phone')
      .lean();

    return res.status(200).json({
      message: 'Pickup code verified! Showing path to customer location.',
      order: populated,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyDeliveryOtpByRider = async (req, res) => {
  try {
    const { otp } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

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
    return res.status(200).json({ message: 'Order Delivered.', order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

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
      .sort({ createdAt: -1 })
      .lean();

    const sanitizedOrders = orders.map((orderItem) => {
      const copy = { ...orderItem };
      delete copy.riderOtp;
      delete copy.customerOtp;
      return copy;
    });

    return res.status(200).json(sanitizedOrders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};