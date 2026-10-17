import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function TrackOrder() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch specific ID, or fetch user's latest order if no ID provided
        const endpoint = id && id !== 'latest' ? `${API_BASE}/orders/${id}` : `${API_BASE}/orders/my-orders`;
        
        const { data } = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(data)) {
          setOrder(data[0] || null); // Grab newest if fetching list
        } else {
          setOrder(data.order || data); // Grab direct order object
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load order details');
      } finally {
        // Fix: setLoading to false in finally block prevents infinite loading screen
        setLoading(false); 
      }
    };

    fetchOrder();
    const interval = setInterval(fetchOrder, 5000); // Live tracking refresh
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl text-orange-600 font-semibold animate-pulse">Loading your FoodExpress order...</p>
      </div>
    );
  }

  if (error || !order) {
    return <div className="p-10 text-center text-red-600 font-bold text-lg">{error || 'No active order found.'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto my-8 p-6 bg-white border rounded-xl shadow-lg">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">Order #{order._id.slice(-6)}</h2>
        <span className="px-4 py-1 rounded-full bg-orange-100 text-orange-700 font-bold uppercase text-sm tracking-wide">
          {order.status}
        </span>
      </div>

      {/* Customer Delivery OTP UI (Hidden if order is delivered) */}
      {order.status !== 'delivered' && order.customerOtp && (
        <div className="my-6 p-5 bg-green-50 border-2 border-green-200 rounded-lg text-center shadow-sm">
          <p className="text-sm text-green-800 font-medium mb-1">
            Share this Delivery OTP with your Rider when receiving your food:
          </p>
          <p className="text-4xl font-extrabold tracking-[0.2em] text-green-700">
            {order.customerOtp}
          </p>
        </div>
      )}

      {order.rider && (
        <div className="my-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="font-semibold text-blue-900">Assigned Rider: {order.rider.name}</p>
          <p className="text-sm text-blue-800">Phone: {order.rider.phone}</p>
        </div>
      )}

      <div className="my-6 space-y-4">
        <h4 className="font-bold text-lg text-gray-700 border-b pb-2">Items Ordered:</h4>
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border">
            <img
              src={item.image || 'https://via.placeholder.com/60'}
              alt={item.name}
              className="w-16 h-16 object-cover rounded shadow-sm"
            />
            <div className="flex-1">
              <p className="font-bold text-gray-800">{item.name}</p>
              <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
            </div>
            <div className="font-bold text-lg text-gray-800">
              ₹{item.price * item.quantity}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t-2 font-bold text-xl text-gray-800">
        <span>Total Paid:</span>
        <span className="text-orange-600">₹{order.totalAmount}</span>
      </div>
    </div>
  );
}