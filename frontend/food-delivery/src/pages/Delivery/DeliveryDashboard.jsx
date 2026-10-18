import React, { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState([]);
  const [customerOtpInputs, setCustomerOtpInputs] = useState({});

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
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-bold text-lg">Order #{order._id.slice(-6)}</span>
                  <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold uppercase rounded-full">
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Pickup From</p>
                    <p className="font-semibold text-gray-800">{order.shop?.name}</p>
                    <p className="text-sm text-gray-600">{order.shop?.address}</p>
                    <p className="text-sm text-gray-600 mt-1">Phone: {order.shop?.phone}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs text-gray-500 font-bold uppercase mb-1">Deliver To</p>
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

              <div className="flex flex-col justify-center items-end gap-3 min-w-[220px] border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-gray-200">
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
    </div>
  );
}