import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, ShoppingBag } from 'lucide-react';
import api from '../../api/axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: [], shops: [], orders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/admin/stats');
        setStats({
          users: data.users || [],
          shops: data.shops || [],
          orders: data.orders || [],
        });
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
        <Link
          to="/admin"
          className="bg-orange-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-orange-700 transition"
        >
          Manage Vendors &rarr;
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading platform statistics...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-gray-500 text-sm font-medium">Total Users</h2>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats.users.length}</p>
              </div>
              <Users className="text-blue-500" size={42} />
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-gray-500 text-sm font-medium">Registered Restaurants</h2>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.shops.length}</p>
              </div>
              <Store className="text-orange-500" size={42} />
            </div>

            <div className="bg-white p-6 rounded-xl border shadow-xs flex items-center justify-between">
              <div>
                <h2 className="text-gray-500 text-sm font-medium">Total Orders</h2>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.orders.length}</p>
              </div>
              <ShoppingBag className="text-green-500" size={42} />
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-xs p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Orders</h3>
            {stats.orders.length === 0 ? (
              <p className="text-gray-500">No orders placed yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="py-2">Order ID</th>
                      <th className="py-2">Customer</th>
                      <th className="py-2">Restaurant</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.orders.slice(0, 10).map((o) => (
                      <tr key={o._id} className="border-b last:border-0">
                        <td className="py-3 font-mono font-semibold">#{o._id.slice(-6)}</td>
                        <td className="py-3">{o.customer?.name || 'N/A'}</td>
                        <td className="py-3">{o.shop?.name || 'N/A'}</td>
                        <td className="py-3 font-bold">₹{o.totalAmount}</td>
                        <td className="py-3 uppercase text-xs font-bold text-orange-600">
                          {o.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;