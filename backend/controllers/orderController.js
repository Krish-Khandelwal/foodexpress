import Order from '../models/Order.js';
// 1. Razorpay import commented out for testing
// import { razorpay } from '../config/razorpay.js';

export const createOrder = async (req, res) => {
  const { shopId, items, totalAmount, deliveryAddress } = req.body;
  
  try {
    // 2. Creates the order directly in MongoDB for testing
    const newOrder = await Order.create({
      customerId: req.user._id,
      shopId,
      items,
      totalAmount,
      deliveryAddress,
      paymentDetails: {
        razorpayOrderId: `TEST_ORDER_${Date.now()}`,
        paymentStatus: 'PAID'
      }
    });

    res.status(201).json({ order: newOrder, razorpayOrderId: `TEST_ORDER_${Date.now()}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. The missing function is restored here
export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, deliveryBoyId } = req.body;
  try {
    const updateFields = { status };
    if (deliveryBoyId) updateFields.deliveryBoyId = deliveryBoyId;

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateFields, { new: true });
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};