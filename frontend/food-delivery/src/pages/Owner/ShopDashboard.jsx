import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, MapPin, Edit3 } from 'lucide-react';
import api from '../../api/axios';
import LocationMap from '../../components/Maps/LocationMap';

export default function ShopDashboard() {
  const [shop, setShop] = useState({
    name: '',
    address: '',
    phone: '',
    cuisine: '',
    description: '',
    location: { lat: 28.6139, lng: 77.209 },
  });
  const [showShopModal, setShowShopModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pickupOtpInputs, setPickupOtpInputs] = useState({});
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchShop();
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchShop = async () => {
    try {
      const { data } = await api.get('/auth/my-shop');
      if (data) {
        setShop({
          ...data,
          location: data.location || { lat: 28.6139, lng: 77.209 },
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/owner-orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/my-shop', shop);
      setShop(data.shop);
      setShowShopModal(false);
      setFeedback({ type: 'success', text: 'Restaurant details updated!' });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save restaurant',
      });
    }
  };

  const reverseGeocodeEnglish = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`
      );
      const geo = await res.json();
      if (geo?.display_name) {
        setShop((prev) => ({ ...prev, address: geo.display_name }));
      }
    } catch {
      // Ignore reverse geocode failure
    }
  };

  const handleDetectShopGps = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setShop((prev) => ({
        ...prev,
        location: { lat: latitude, lng: longitude },
      }));
      await reverseGeocodeEnglish(latitude, longitude);
    });
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update status',
      });
    }
  };

  const handleVerifyRiderOtp = async (orderId) => {
    const otp = pickupOtpInputs[orderId];
    if (!otp) {
      setFeedback({ type: 'error', text: 'Please enter the Rider Pickup OTP.' });
      return;
    }
    try {
      await api.post(`/orders/${orderId}/verify-pickup-otp`, { otp });
      setFeedback({
        type: 'success',
        text: 'Pickup OTP verified! Order is now Out for Delivery.',
      });
      fetchOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Invalid Rider OTP',
      });
    }
  };

  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-xl shadow-xs border">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{shop?.name || 'My Restaurant'}</h1>
          <p className="text-gray-600 text-sm mt-1">
            {shop?.address || 'No address set'} • {shop?.cuisine || 'Multi-Cuisine'}
          </p>
          {shop?.phone && <p className="text-xs text-gray-500 mt-0.5">Phone: {shop.phone}</p>}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowShopModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 border rounded-lg hover:bg-gray-100 font-medium text-sm cursor-pointer"
          >
            <Edit3 size={16} />
            <span>Edit Restaurant Details</span>
          </button>
          <Link
            to="/manage-menu"
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold text-sm shadow-xs"
          >
            <UtensilsCrossed size={16} />
            <span>Manage Menu Items</span>
          </Link>
        </div>
      </div>

      {feedback.text && (
        <div
          className={`p-3 rounded-lg text-sm font-medium border flex justify-between items-center ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-700 border-green-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback({ type: '', text: '' })}
            className="text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Orders Section */}
      <div className="bg-white p-6 rounded-xl shadow-xs border">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Current & Recent Orders</h2>
            <p className="text-sm text-gray-500">
              Active Orders: <strong className="text-orange-600">{activeOrdersCount}</strong> •
              Total Orders: <strong>{orders.length}</strong>
            </p>
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="text-gray-500 py-10 text-center">No orders received yet.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order._id}
                className="border rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4 bg-gray-50"
              >
                <div className="space-y-1">
                  <p className="font-bold text-lg text-gray-800">Order #{order._id.slice(-6)}</p>
                  <p className="text-sm text-gray-700">
                    Customer: <strong>{order.customer?.name}</strong> ({order.customer?.phone})
                  </p>
                  <p className="text-sm text-gray-600">Delivery Address: {order.deliveryAddress}</p>
                  <div className="text-sm mt-2 bg-white p-3 rounded-lg border">
                    <span className="font-semibold text-gray-700">Items: </span>
                    {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')} —{' '}
                    <strong className="text-orange-600">₹{order.totalAmount}</strong>
                  </div>
                  {order.rider && (
                    <p className="text-sm text-blue-600 font-semibold pt-1">
                      Rider Assigned: {order.rider.name} ({order.rider.phone})
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between min-w-55">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-200 text-orange-800">
                    {order.status}
                  </span>

                  {['pending', 'preparing', 'ready'].includes(order.status) && (
                    <div className="mt-3 w-full">
                      <label className="text-xs text-gray-500 block mb-1">Update Status:</label>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className="border rounded-lg w-full p-2 text-sm bg-white"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready for Pickup</option>
                      </select>
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <div className="mt-4 flex flex-col gap-2 w-full">
                      <input
                        type="text"
                        placeholder="Enter Rider OTP"
                        className="border rounded-lg px-2 py-2 text-sm w-full font-mono text-center tracking-widest bg-white"
                        value={pickupOtpInputs[order._id] || ''}
                        onChange={(e) =>
                          setPickupOtpInputs({
                            ...pickupOtpInputs,
                            [order._id]: e.target.value,
                          })
                        }
                      />
                      <button
                        onClick={() => handleVerifyRiderOtp(order._id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm w-full font-bold transition cursor-pointer"
                      >
                        Verify OTP & Handover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Restaurant Profile Modal */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveShop}
            className="bg-white p-6 rounded-xl w-full max-w-lg space-y-3 my-8"
          >
            <h3 className="text-xl font-bold text-gray-800">Edit Restaurant Profile</h3>
            <input
              type="text"
              placeholder="Restaurant Name *"
              required
              className="w-full p-2.5 border rounded-lg"
              value={shop.name || ''}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address *"
              required
              className="w-full p-2.5 border rounded-lg"
              value={shop.address || ''}
              onChange={(e) => setShop({ ...shop, address: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Phone"
                className="w-full p-2.5 border rounded-lg"
                value={shop.phone || ''}
                onChange={(e) => setShop({ ...shop, phone: e.target.value })}
              />
              <input
                type="text"
                placeholder="Cuisine"
                className="w-full p-2.5 border rounded-lg"
                value={shop.cuisine || ''}
                onChange={(e) => setShop({ ...shop, cuisine: e.target.value })}
              />
            </div>
            <textarea
              placeholder="Description"
              rows={2}
              className="w-full p-2.5 border rounded-lg"
              value={shop.description || ''}
              onChange={(e) => setShop({ ...shop, description: e.target.value })}
            />

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-600 uppercase">
                  Restaurant Map Location (Click map to pin)
                </label>
                <button
                  type="button"
                  onClick={handleDetectShopGps}
                  className="text-xs font-semibold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <MapPin size={14} /> Use Current GPS
                </button>
              </div>
              <div className="h-48 w-full">
                <LocationMap
                  lat={shop.location?.lat || 28.6139}
                  lng={shop.location?.lng || 77.209}
                  popupText={shop.name || 'Restaurant Location'}
                  selectable
                  onSelectLocation={async ({ lat, lng }) => {
                    setShop((prev) => ({ ...prev, location: { lat, lng } }));
                    await reverseGeocodeEnglish(lat, lng);
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}