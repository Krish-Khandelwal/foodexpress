import Order from '../models/Order.js';
import Shop from '../models/Shop.js';
import MenuItem from '../models/MenuItem.js';
import razorpay, { isRazorpayConfigured } from '../config/razorpay.js';
import crypto from 'crypto';

// Helper function to generate a random 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// 1. Create Razorpay Order for Online Payment
// Route: POST /api/orders/create-razorpay-order
export const createRazorpayOrder = async (req, res) => {
  try {
    // Step 1: Check if Razorpay keys are configured in .env
    if (!isRazorpayConfigured()) {
      return res.status(400).json({
        message: 'Razorpay keys are not configured in backend/.env. Please use Cash on Delivery (COD).',
      });
    }

    // Step 2: Prepare Razorpay order options (amount in paise)
    const { amount } = req.body;
    const amountInPaise = Math.max(100, Math.round(Number(amount) * 100));

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    // Step 3: Create order on Razorpay server and send back to frontend
    const rzpOrder = await razorpay.orders.create(options);

    return res.status(200).json({
      ...rzpOrder,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Create New Food Order (Single Restaurant Rule + Open Restaurant Check)
// Route: POST /api/orders
export const createOrder = async (req, res) => {
  try {
    // Step 1: Extract order details from request body
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

    // Step 2: Validate that the cart has items
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Step 3: Fetch any missing shop info in ONE fast database query
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

    // Step 4: Build clean order items list and collect unique restaurant IDs
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

    // Step 5: Block ordering from more than 1 restaurant at a time
    if (shopIdSet.size > 1) {
      return res.status(400).json({
        message: 'You can only order food from 1 restaurant at a time!',
      });
    }

    if (shopIdSet.size === 0) {
      const fallbackShop = await Shop.findOne({ status: 'approved', isOpen: true }).lean();
      if (fallbackShop) {
        shopIdSet.add(fallbackShop._id.toString());
      }
    }

    const uniqueShopIds = Array.from(shopIdSet);
    if (uniqueShopIds.length === 0) {
      return res.status(400).json({ message: 'No restaurant found for this order' });
    }

    // Step 6: Verify that the restaurant is approved and currently open
    const targetShop = await Shop.findById(uniqueShopIds[0]).lean();
    if (!targetShop || targetShop.status !== 'approved') {
      return res.status(400).json({ message: 'This restaurant is not currently approved for orders.' });
    }
    if (targetShop.isOpen === false) {
      return res.status(400).json({
        message: `"${targetShop.name}" is currently closed and not accepting orders.`,
      });
    }

    // Step 7: Verify Razorpay signature if paid online
    if (razorpayOrderId && razorpayPaymentId && razorpaySignature && isRazorpayConfigured()) {
      const signBody = `${razorpayOrderId}|${razorpayPaymentId}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(signBody)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }

    // Step 8: Calculate final total and generate OTPs
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

    // Step 9: Save order in MongoDB
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

    // Step 10: Populate details and return response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location rating numReviews')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .lean();

    return res.status(201).json({ ...populatedOrder, order: populatedOrder });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Get Single Order By ID
// Route: GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location rating numReviews')
      .populate('shops', 'name address phone location')
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

// 4. Get Logged-In Customer's Orders
// Route: GET /api/orders/my-orders
export const getCustomerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('shop', 'name address phone location rating numReviews')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Get Restaurant Owner's Orders (Shows riderOtp to Owner)
// Route: GET /api/orders/owner-orders
export const getOwnerOrders = async (req, res) => {
  try {
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (!shop) {
      return res.status(200).json([]);
    }

    const orders = await Order.find({
      $or: [{ shop: shop._id }, { shops: shop._id }, { 'items.shop': shop._id }],
    })
      .populate('customer', 'name email phone')
      .populate('shop', 'name address phone location')
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    // Hide customerOtp from Owner, but keep riderOtp so Owner can share Pickup Code with Rider
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

// 6. Update Order Status by Restaurant Owner
// Route: PUT /api/orders/:id/status
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

    // Block modifying orders that are already out for delivery, delivered, or cancelled
    if (['out for delivery', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot change status because order is already ${order.status}.`,
      });
    }

    // Verify shop ownership
    const shop = await Shop.findOne({ owner: req.user._id }).lean();
    if (shop && order.shop.toString() !== shop._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    order.status = status;

    // Ensure Pickup Code exists when order is marked Ready
    if (status === 'ready' && !order.riderOtp) {
      order.riderOtp = generateOTP();
    }

    await order.save();
    return res.status(200).json(order);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 7. Cancel Order by Customer (Only allowed while 'pending' or 'preparing')
// Route: PUT /api/orders/:id/cancel
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

    // Customers can only cancel before the order is marked 'ready' or picked up
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

// 8. Rate Food Quality by Customer (Only after order is 'delivered' and once per order)
// Route: POST /api/orders/:id/rate
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

    // Step 1: Ensure order is delivered before allowing food rating
    if (order.status !== 'delivered') {
      return res.status(400).json({
        message: 'You can rate food quality only after your order is delivered.',
      });
    }

    // Step 2: Check if this order was already rated previously
    const isFirstTimeRating = !order.rating;

    // Step 3: Save rating on the Order
    order.rating = numericRating;
    order.review = (review || '').trim();
    order.ratedAt = new Date();
    await order.save();

    // Step 4: Recalculate Restaurant average rating across all rated orders
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

    // Step 5: Increment MenuItems review count only on first rating for this order
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

// 9. Accept Delivery by Rider (Only when order is 'ready')
// Route: PUT /api/orders/:id/accept-delivery
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
      .populate('shops', 'name address phone location')
      .populate('rider', 'name phone')
      .lean();

    delete populated.riderOtp;
    delete populated.customerOtp;

    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 10. Update Rider Live GPS Location
// Route: PUT /api/orders/:id/rider-location
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
      { new: true }
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

// 11. Verify Restaurant Pickup Code -> Switches Rider Map to Customer Path
// Route: POST /api/orders/:id/verify-pickup-otp
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
      .populate('shops', 'name address phone location')
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

// 12. Verify Customer Delivery OTP -> Marks Order Delivered
// Route: POST /api/orders/:id/verify-delivery-otp
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

// 13. Get Available ('ready') and Accepted Orders for Rider
// Route: GET /api/orders/rider/available
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
      .sort({ createdAt: -1 })
      .lean();

    // Hide both riderOtp and customerOtp from Rider screen
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