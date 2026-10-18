import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { loadRazorpayScript } from '../../utils/loadRazorpay';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-xl shadow border text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Add some delicious food items before checking out.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const placeFinalOrder = async (paymentDetails = {}) => {
    const orderPayload = {
      shopId: cart[0]?.shopId,
      items: cart.map((item) => ({
        menuItem: item.menuItem,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
      })),
      totalAmount: cartTotal,
      deliveryAddress,
      paymentMethod,
      ...paymentDetails,
    };

    const { data } = await api.post('/orders', orderPayload);
    clearCart();
    const createdId = data?._id || data?.order?._id || 'latest';
    navigate(`/track-order/${createdId}`);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!deliveryAddress.trim()) {
      setError('Please enter your delivery address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (paymentMethod === 'ONLINE') {
        const sdkLoaded = await loadRazorpayScript();
        if (!sdkLoaded) {
          throw new Error('Failed to load Razorpay SDK. Check your internet connection or use COD.');
        }

        const { data: rzpOrder } = await api.post('/orders/create-razorpay-order', {
          amount: cartTotal,
        });

        const options = {
          key: rzpOrder.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency || 'INR',
          name: 'FoodExpress',
          description: 'Food Order Payment',
          order_id: rzpOrder.id,
          handler: async (response) => {
            await placeFinalOrder({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          },
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: { color: '#ea580c' },
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.open();
      } else {
        await placeFinalOrder();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to process checkout. Try Cash on Delivery.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 my-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Checkout</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Order Summary</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.menuItem} className="flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-gray-800">{item.name}</p>
                  <p className="text-gray-500">
                    ₹{item.price} × {item.quantity}
                  </p>
                </div>
                <span className="font-bold text-gray-800">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-4 pt-4 flex justify-between items-center text-lg font-bold">
            <span>Total Payable</span>
            <span className="text-orange-600">₹{cartTotal}</span>
          </div>
        </div>

        {/* Delivery & Payment Form */}
        <form
          onSubmit={handlePlaceOrder}
          className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 space-y-4"
        >
          <h2 className="text-lg font-bold text-gray-800 border-b pb-2">Delivery Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Delivery Address *
            </label>
            <textarea
              rows={3}
              required
              placeholder="House/Flat No., Building, Street, Landmark, City"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                />
                <span className="font-medium text-sm text-gray-800">
                  Cash on Delivery / Pay on Delivery
                </span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ONLINE"
                  checked={paymentMethod === 'ONLINE'}
                  onChange={() => setPaymentMethod('ONLINE')}
                />
                <span className="font-medium text-sm text-gray-800">
                  Pay Online (Razorpay)
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${cartTotal}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Checkout;