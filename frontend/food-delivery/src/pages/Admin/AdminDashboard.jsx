import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Store } from 'lucide-react';

const AdminDashboard = () => {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-gray-500">Pending Vendor Approvals</h2>
            <p className="text-2xl font-bold text-orange-600">3 Requests</p>
          </div>
          <Store className="text-orange-200" size={48} />
        </div>
      </div>
      <Link to="/admin" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold">
        Review Vendors &rarr;
      </Link>
    </div>
  );
};
export default AdminDashboard;