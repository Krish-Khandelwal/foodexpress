import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Store, ShoppingBag, Plus, Trash2, Tag } from 'lucide-react';
import api from '../../api/axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: [], shops: [], orders: [], categories: [] });
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats({
        users: data.users || [],
        shops: data.shops || [],
        orders: data.orders || [],
        categories: data.categories || [],
      });
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setCategoryError('');
    try {
      await api.post('/admin/categories', { name: newCategory.trim() });
      setNewCategory('');
      fetchStats();
    } catch (err) {
      setCategoryError(err.response?.data?.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      fetchStats();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          {/* Admin Food Category Management for Owner Dropdown */}
          <div className="bg-white rounded-xl border shadow-xs p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="text-orange-600" size={20} />
              <h3 className="text-xl font-bold text-gray-800">
                Manage Food Categories (Shown in Restaurant Owner Dropdown)
              </h3>
            </div>

            {categoryError && (
              <p className="text-xs text-red-600 mb-3 font-medium">{categoryError}</p>
            )}

            <form onSubmit={handleAddCategory} className="flex gap-3 mb-5 max-w-md">
              <input
                type="text"
                placeholder="Add new category (e.g. South Indian, Tandoor)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3.5 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 cursor-pointer"
              >
                <Plus size={16} /> Add
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {stats.categories.map((cat) => (
                <div
                  key={cat._id}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-full text-sm font-semibold"
                >
                  <span>{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat._id)}
                    className="text-orange-500 hover:text-red-600 cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders Table */}
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
                      <th className="py-2">Restaurant(s)</th>
                      <th className="py-2">Amount</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.orders.slice(0, 10).map((o) => (
                      <tr key={o._id} className="border-b last:border-0">
                        <td className="py-3 font-mono font-semibold">#{o._id.slice(-6)}</td>
                        <td className="py-3">{o.customer?.name || 'N/A'}</td>
                        <td className="py-3">
                          {Array.isArray(o.shops) && o.shops.length > 0
                            ? o.shops.map((s) => s.name).join(' + ')
                            : o.shop?.name || 'N/A'}
                        </td>
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