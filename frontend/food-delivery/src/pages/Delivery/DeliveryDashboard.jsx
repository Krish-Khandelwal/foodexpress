import React, { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import LocationMap from '../../components/Maps/LocationMap';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  '/api',
  ''
);

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [customerOtpInputs, setCustomerOtpInputs] = useState({});
  const [activeMapOrder, setActiveMapOrder] = useState(null);
  const [riderCoords, setRiderCoords] = useState({ lat: 28.618, lng: 77.212 });

  useEffect(() => {
    fetchRiderOrders();
    const interval = setInterval(fetchRiderOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRiderOrders = async () => {
    try {
      const { data } = await api.get('/orders/rider/available');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      const { data } = await api.put(`/orders/${orderId}/accept-delivery`);
      alert(`Delivery Accepted! Give this Pickup OTP to the Restaurant Owner: ${data.riderOtp}`);
      fetchRiderOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept order');
    }
  };

  const handleVerifyCustomerOtp = async (orderId) => {
    const otp = customerOtpInputs[orderId];
    if (!otp) return alert('Enter the Customer OTP to complete delivery');
    try {
      await api.post(`/orders/${orderId}/verify-delivery-otp`, { otp });
      alert('Customer OTP verified! Order marked as Delivered.');
      fetchRiderOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid Customer OTP');
    }
  };

  // Broadcast Rider GPS or Clicked Map Position to Customer & Backend
  const broadcastRiderLocation = async (orderId, lat, lng) => {
    setRiderCoords({ lat, lng });
    try {
      await api.put(`/orders/${orderId}/rider-location`, { lat, lng });
      const socket = io(SOCKET_URL);
      socket.emit('sendLocation', { orderId, lat, lng });
      setTimeout(() => socket.disconnect(), 1000);
    } catch (err) {
      console.error('Failed to update rider location:', err);
    }
  };

  const handleShareMyGps = (orderId) => {
    if (!navigator.geolocation) {
      return alert('Geolocation not supported by browser');
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        broadcastRiderLocation(orderId, latitude, longitude);
        alert('Your live GPS location has been sent to the customer!');
      },
      () => alert('Could not get GPS. You can also click on the map to update your rider pin.')
    );
  };

  return (
    <div className="p-6 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">FoodExpress Delivery Dashboard</h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-500 text-lg">
          No available orders at the moment. Keep waiting...
        </p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="border border-gray-200 rounded-xl p-5 bg-white shadow-xs flex flex-col md:flex-row justify-between gap-6"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg">Order #{order._id.slice(-6)}</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold uppercase rounded-full">
                      {order.status}
                    </span>
                  </div>

                  {/* Open Route Map Window Button */}
                  <button
                    onClick={() => {
                      setRiderCoords(
                        order.riderLocation?.lat
                          ? order.riderLocation
                          : {
                              lat: (order.shop?.location?.lat || 28.6139) + 0.003,
                              lng: (order.shop?.location?.lng || 77.209) + 0.003,
                            }
                      );
                      setActiveMapOrder(order);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 cursor-pointer"
                  >
                    <MapPin size={15} />
                    <span>View Pickup & Delivery Map</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-xs text-orange-600 font-bold uppercase mb-1">
                      🏪 Pickup From (Restaurant)
                    </p>
                    <p className="font-semibold text-gray-800">{order.shop?.name}</p>
                    <p className="text-sm text-gray-600">{order.shop?.address}</p>
                    <p className="text-sm text-gray-600 mt-1">Phone: {order.shop?.phone}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg border">
                    <p className="text-xs text-green-700 font-bold uppercase mb-1">
                      🏠 Deliver To (Customer)
                    </p>
                    <p className="font-semibold text-gray-800">{order.customer?.name}</p>
                    <p className="text-sm text-gray-600">{order.deliveryAddress}</p>
                    <p className="text-sm text-gray-600 mt-1">Phone: {order.customer?.phone}</p>
                  </div>
                </div>

                {order.riderOtp &&
                  order.status !== 'out for delivery' &&
                  order.status !== 'delivered' && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 flex justify-between items-center">
                      <span className="text-sm font-medium">
                        Pickup OTP (Give to Restaurant):
                      </span>
                      <span className="font-mono text-2xl font-bold tracking-widest">
                        {order.riderOtp}
                      </span>
                    </div>
                  )}
              </div>

              <div className="flex flex-col justify-center items-end gap-3 min-w-55 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-200">
                {!order.rider && (
                  <button
                    onClick={() => handleAcceptOrder(order._id)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    Accept Delivery
                  </button>
                )}

                {order.status === 'out for delivery' && (
                  <div className="w-full flex flex-col gap-2">
                    <label className="text-xs text-gray-600 font-bold">
                      Customer OTP Required:
                    </label>
                    <input
                      type="text"
                      placeholder="Enter Customer OTP"
                      className="border-2 border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest w-full font-mono"
                      value={customerOtpInputs[order._id] || ''}
                      onChange={(e) =>
                        setCustomerOtpInputs({
                          ...customerOtpInputs,
                          [order._id]: e.target.value,
                        })
                      }
                    />
                    <button
                      onClick={() => handleVerifyCustomerOtp(order._id)}
                      className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      Verify & Complete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map Window Modal for Pickup (Restaurant) & Drop-off (Customer) */}
      {activeMapOrder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Route Map — Order #{activeMapOrder._id.slice(-6)}
                </h2>
                <p className="text-xs text-gray-500">
                  🏪 Pickup: {activeMapOrder.shop?.name} ({activeMapOrder.shop?.address}) &rarr; 🏠
                  Drop-off: {activeMapOrder.customer?.name} ({activeMapOrder.deliveryAddress})
                </p>
              </div>
              <button
                onClick={() => setActiveMapOrder(null)}
                className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded-lg cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 bg-gray-50 p-3 rounded-lg border text-xs">
              <div className="flex gap-4 font-semibold">
                <span>🏪 Restaurant (Pickup)</span>
                <span>🛵 You (Click map to move pin)</span>
                <span>🏠 Customer (Drop-off)</span>
              </div>
              <button
                onClick={() => handleShareMyGps(activeMapOrder._id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 cursor-pointer"
              >
                <Navigation size={14} />
                <span>Send My Live GPS to Customer</span>
              </button>
            </div>

            <div className="h-96 w-full">
              <LocationMap
                shopLocation={
                  activeMapOrder.shop?.location || { lat: 28.6139, lng: 77.209 }
                }
                customerLocation={
                  activeMapOrder.customerLocation || { lat: 28.625, lng: 77.215 }
                }
                riderLocation={riderCoords}
                shopName={`Pickup: ${activeMapOrder.shop?.name || 'Restaurant'}`}
                customerName={`Deliver: ${activeMapOrder.customer?.name} (${activeMapOrder.deliveryAddress})`}
                riderName="Your Rider Position"
                selectable
                onSelectLocation={({ lat, lng }) =>
                  broadcastRiderLocation(activeMapOrder._id, lat, lng)
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}