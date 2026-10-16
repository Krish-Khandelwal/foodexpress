import React from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, Package } from 'lucide-react';

const ShopDashboard = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Owner Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <TrendingUp className="text-blue-500 mb-2" size={32} />
          <h2 className="text-gray-500">Today's Sales</h2>
          <p className="text-2xl font-bold">₹4,250</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <Package className="text-green-500 mb-2" size={32} />
          <h2 className="text-gray-500">Pending Orders</h2>
          <p className="text-2xl font-bold">12</p>
        </div>
      </div>
      <Link to="/owner" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
        Manage Menu & Inventory &rarr;
      </Link>
    </div>
  );
};
export default ShopDashboard;