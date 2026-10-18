import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';
import { loadRazorpayScript } from '../../utils/loadRazorpay';
import LocationMap from '../../components/Maps/LocationMap';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerLocation, setCustomerLocation] = useState({
    lat: 28.6139,
    lng: 77.209,
  });
  const [detectingGps, setDetectingGps] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setDeliveryAddress(data.display_name);
      } else {
        setDeliveryAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
      }
    } catch {
      setDeliveryAddress(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`);
    }
  };

  const handleMapSelect = async ({ lat, lng }) => {
    setCustomerLocation({ lat, lng });
    await reverseGeocode(lat, lng);
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      return alert('Geolocation is not supported by your browser');
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCustomerLocation({ lat: latitude, lng: longitude });
        await reverseGeocode(latitude, longitude);
        setDetectingGps(false);
      },
      () => {
        alert('Could not access GPS location. You can click directly on the map instead.');
        setDetectingGps(false);
      }
    );
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-xl shadow-xs border text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Your Cart is Empty</h2>
        <p className="text-gray-600 mb-6">Add some delicious food items before checking out.</p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"
        >
          ← Back to Home
        </Link>
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
        isVeg: item.isVeg !== false,
      })),
      totalAmount: cartTotal,
      deliveryAddress,
      customerLocation,
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
      setError('Please enter your delivery address or select it on the map');
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
    <div className="max-w-5xl mx-auto p-6 my-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Checkout</h1>
        <Link
          to="/"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border rounded-lg text-sm font-bold text-orange-600 hover:bg-orange-50 shadow-2xs"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-200 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Delivery Location Map & Form */}
        <form
          onSubmit={handlePlaceOrder}
          className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 space-y-4"
        >
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-lg font-bold text-gray-800">1. Choose Delivery Location</h2>
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={detectingGps}
              className="flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-100 cursor-pointer"
            >
              <MapPin size={14} />
              <span>{detectingGps ? 'Detecting GPS...' : 'Use Current GPS Location'}</span>
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Click anywhere on the map below to pin your exact delivery location and auto-fill your
            address:
          </p>

          <div className="h-64 w-full">
            <LocationMap
              lat={customerLocation.lat}
              lng={customerLocation.lng}
              popupText="Your Delivery Pin"
              selectable
              onSelectLocation={handleMapSelect}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Delivery Address *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Click on the map above or type your House/Flat No., Street, Landmark, City"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              2. Payment Method
            </label>
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
                <span className="font-medium text-sm text-gray-800">Pay Online (Razorpay)</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Placing Order...' : `Place Order • ₹${cartTotal}`}
          </button>
        </form>

        {/* Right: Order Summary */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Order Summary</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
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
      </div>
    </div>
  );
};

export default Checkout;