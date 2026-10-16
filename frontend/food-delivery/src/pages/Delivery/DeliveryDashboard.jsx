import React, { useState } from 'react';
import LocationMap from '../../components/Maps/LocationMap';

const DeliveryDashboard = () => {
  const [activeOrder, setActiveOrder] = useState(null);
  
  // Dummy Order
  const [availableOrders, setAvailableOrders] = useState([{
      _id: 'ord_991', shopName: 'Makhana Hub', pickupAddress: 'Sector 3, Dwarka', dropAddress: 'Uttam Nagar', totalPay: 40, dropLat: 28.6189, dropLng: 77.0544
  }]);

  const handleAcceptOrder = (order) => {
    setActiveOrder(order);
    setAvailableOrders(availableOrders.filter(o => o._id !== order._id));
  };

  if (activeOrder) {
    return (
      <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
        <div className="bg-white p-4 rounded-xl shadow-sm border mb-4">
          <h2 className="text-xl font-bold">Order {activeOrder._id}</h2>
        </div>
        <div className="h-80 w-full mb-4 shadow-md rounded-xl overflow-hidden border">
          <LocationMap lat={activeOrder.dropLat} lng={activeOrder.dropLng} popupText="Deliver Here" />
        </div>
        <button onClick={() => setActiveOrder(null)} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl">Mark as Delivered</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Available Orders</h1>
      {availableOrders.map((order) => (
        <div key={order._id} className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <h3 className="font-bold">{order.shopName} - ₹{order.totalPay}</h3>
          <p className="text-sm text-gray-600 mt-2">To: {order.dropAddress}</p>
          <button onClick={() => handleAcceptOrder(order)} className="w-full bg-blue-50 text-blue-700 font-bold py-3 mt-4 rounded">Accept Delivery</button>
        </div>
      ))}
    </div>
  );
};
export default DeliveryDashboard;