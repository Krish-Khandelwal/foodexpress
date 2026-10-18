import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import LocationMap from '../../components/Maps/LocationMap';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(
  '/api',
  ''
);

export default function TrackOrder() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [liveRiderCoords, setLiveRiderCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (id && id !== 'latest') {
          const { data } = await api.get(`/orders/${id}`);
          const ord = data.order || data;
          setOrder(ord);
          if (ord?.riderLocation?.lat) {
            setLiveRiderCoords(ord.riderLocation);
          }
        } else {
          const { data } = await api.get('/orders/my-orders');
          if (Array.isArray(data)) {
            setAllOrders(data);
            const first = data[0] || null;
            setOrder(first);
            if (first?.riderLocation?.lat) {
              setLiveRiderCoords(first.riderLocation);
            }
          }
        }
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!order?._id) return;
    const socket = io(SOCKET_URL);
    socket.emit('joinOrderRoom', order._id);
    socket.on('updateLocation', (coords) => {
      if (coords?.lat && coords?.lng) {
        setLiveRiderCoords({ lat: coords.lat, lng: coords.lng });
      }
    });
    return () => socket.disconnect();
  }, [order?._id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl text-orange-600 font-semibold animate-pulse">
          Loading your FoodExpress order...
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white rounded-xl border text-center">
        <p className="text-gray-600 font-semibold text-lg mb-4">
          {error || 'You have no orders yet.'}
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700"
        >
          ← Back to Home
        </Link>
      </div>
    );
  }

  const shopLocation = order.shop?.location || { lat: 28.6139, lng: 77.209 };
  const customerLocation = order.customerLocation || { lat: 28.625, lng: 77.215 };
  const riderLocation =
    liveRiderCoords ||
    (order.riderLocation?.lat ? order.riderLocation : null) ||
    (order.rider ? { lat: shopLocation.lat + 0.003, lng: shopLocation.lng + 0.003 } : null);

  const restaurantNames =
    Array.isArray(order.shops) && order.shops.length > 0
      ? order.shops.map((s) => s.name).join(' + ')
      : order.shop?.name || 'FoodExpress';

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Track Your Order</h1>
        <Link
          to="/"
          className="flex items-center gap-1.5 px-4 py-2 bg-white border rounded-lg text-sm font-bold text-orange-600 hover:bg-orange-50 shadow-2xs"
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Live Road Route Map */}
      <div className="p-5 bg-white border rounded-xl shadow-xs">
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <h3 className="font-bold text-gray-800 text-lg">Live Delivery Road Map</h3>
          <div className="flex gap-4 text-xs font-semibold text-gray-600">
            <span>🏪 Restaurant</span>
            <span>🛵 Delivery Rider</span>
            <span>🏠 Your Address</span>
          </div>
        </div>
        <div className="h-80 w-full">
          <LocationMap
            shopLocation={shopLocation}
            additionalShops={order.shops}
            customerLocation={customerLocation}
            riderLocation={riderLocation}
            shopName={restaurantNames}
            customerName={order.deliveryAddress || 'Your Delivery Address'}
            riderName={order.rider ? `Rider: ${order.rider.name}` : 'Rider'}
          />
        </div>
      </div>

      {/* Order Status & OTP Details */}
      <div className="p-6 bg-white border rounded-xl shadow-xs">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Order #{order._id?.slice(-6)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Restaurant(s): <strong>{restaurantNames}</strong> • Address: {order.deliveryAddress}
            </p>
          </div>
          <span className="px-4 py-1.5 rounded-full bg-orange-100 text-orange-700 font-bold uppercase text-sm tracking-wide">
            {order.status}
          </span>
        </div>

        {order.status !== 'delivered' && order.customerOtp && (
          <div className="my-6 p-5 bg-green-50 border-2 border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-800 font-medium mb-1">
              Share this Delivery OTP with your Rider when receiving your food:
            </p>
            <p className="text-4xl font-extrabold tracking-[0.2em] text-green-700">
              {order.customerOtp}
            </p>
          </div>
        )}

        {order.rider ? (
          <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="font-semibold text-blue-900">Assigned Rider: {order.rider.name}</p>
            <p className="text-sm text-blue-800">Phone: {order.rider.phone}</p>
          </div>
        ) : (
          <div className="my-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
            Waiting for a delivery rider to be assigned...
          </div>
        )}

        <div className="my-6 space-y-4">
          <h4 className="font-bold text-lg text-gray-700 border-b pb-2">Items Ordered:</h4>
          {order.items?.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border">
              <img
                src={item.image || 'https://placehold.co/60x60?text=Food'}
                alt={item.name}
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-800">{item.name}</p>
                {item.shopName && (
                  <p className="text-xs text-orange-600 font-semibold">{item.shopName}</p>
                )}
                <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
              </div>
              <div className="font-bold text-lg text-gray-800">₹{item.price * item.quantity}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t-2 font-bold text-xl text-gray-800">
          <span>Total Amount:</span>
          <span className="text-orange-600">₹{order.totalAmount}</span>
        </div>
      </div>

      {allOrders.length > 1 && (
        <div className="p-6 bg-white border rounded-xl shadow-xs">
          <h3 className="font-bold text-gray-800 mb-3">All Your Orders</h3>
          <div className="space-y-2">
            {allOrders.map((o) => (
              <button
                key={o._id}
                onClick={() => {
                  setOrder(o);
                  setLiveRiderCoords(o.riderLocation?.lat ? o.riderLocation : null);
                }}
                className={`w-full text-left p-3 rounded-lg border flex justify-between items-center transition cursor-pointer ${
                  o._id === order._id ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="font-semibold text-sm">
                  #{o._id.slice(-6)} — ₹{o.totalAmount}
                </span>
                <span className="text-xs uppercase font-bold px-2.5 py-1 rounded-full bg-gray-200 text-gray-700">
                  {o.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}