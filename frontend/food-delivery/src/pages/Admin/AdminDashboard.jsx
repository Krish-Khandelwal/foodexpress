import React, { useEffect, useState } from 'react';
import {
  Store,
  Users,
  ShoppingBag,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import API from '../../api/axios';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: [],
    shops: [],
    orders: [],
    categories: [],
  });
  const [activeTab, setActiveTab] = useState('vendors');
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/admin/stats');
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

  const handleVendorStatus = async (shopId, status) => {
    try {
      await API.put(`/admin/vendor-status/${shopId}`, { status });
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    try {
      await API.post('/admin/categories', { name: newCategory.trim() });
      setNewCategory('');
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add category');
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await API.delete(`/admin/categories/${id}`);
      fetchStats();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const newlyRegisteredPendingShops = stats.shops.filter(
    (s) => (s.status || 'pending') === 'pending'
  );
  const reviewedShops = stats.shops.filter(
    (s) => s.status === 'approved' || s.status === 'rejected'
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            Admin Control Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Approve newly registered restaurants, manage categories, orders, and users
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl transition cursor-pointer"
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase text-amber-600">
            New Pending Approvals
          </p>
          <p className="text-3xl font-black text-gray-900 mt-1">
            {newlyRegisteredPendingShops.length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase text-emerald-600">
            Total Restaurants
          </p>
          <p className="text-3xl font-black text-gray-900 mt-1">{stats.shops.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase text-blue-600">Total Orders</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{stats.orders.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase text-purple-600">Total Users</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{stats.users.length}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition ${
            activeTab === 'vendors'
              ? 'bg-orange-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Store size={17} /> Restaurant &amp; Vendor Approvals
          {newlyRegisteredPendingShops.length > 0 && (
            <span className="bg-amber-300 text-gray-900 text-xs px-2 py-0.5 rounded-full font-black">
              {newlyRegisteredPendingShops.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition ${
            activeTab === 'categories'
              ? 'bg-orange-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Layers size={17} /> Food Categories
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition ${
            activeTab === 'orders'
              ? 'bg-orange-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShoppingBag size={17} /> All Orders
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition ${
            activeTab === 'users'
              ? 'bg-orange-600 text-white shadow'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users size={17} /> Users
        </button>
      </div>

      {loading ? (
        <div className="bg-white p-8 rounded-2xl text-center text-gray-500">
          Loading dashboard...
        </div>
      ) : (
        <>
          {/* TAB 1: RESTAURANT & VENDOR APPROVALS */}
          {activeTab === 'vendors' && (
            <div className="space-y-6">
              {/* NEW SECTION BOX: Newly Registered Restaurant Owners Waiting for Approval */}
              <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2.5">
                    <Clock className="text-amber-600" size={24} />
                    <div>
                      <h2 className="text-xl font-extrabold text-gray-900">
                        Newly Registered Restaurant Owners (Pending Admin Approval)
                      </h2>
                      <p className="text-xs text-gray-600">
                        When a Restaurant Owner newly registers, their restaurant appears here for your approval or rejection.
                      </p>
                    </div>
                  </div>
                  <span className="bg-amber-200 text-amber-900 text-xs font-extrabold px-3 py-1 rounded-full">
                    {newlyRegisteredPendingShops.length} Awaiting Action
                  </span>
                </div>

                {newlyRegisteredPendingShops.length === 0 ? (
                  <div className="bg-white rounded-xl p-6 text-center text-gray-500 border border-amber-200 text-sm">
                    No newly registered restaurants are currently waiting for approval.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {newlyRegisteredPendingShops.map((shop) => (
                      <div
                        key={shop._id}
                        className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg font-extrabold text-gray-900">
                              {shop.name}
                            </h3>
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                              New Registration • Pending
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{shop.address}</p>
                          <div className="mt-3 text-xs text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg">
                            <p>
                              <strong>Owner Name:</strong> {shop.owner?.name || 'N/A'}
                            </p>
                            <p>
                              <strong>Owner Email:</strong> {shop.owner?.email || 'N/A'}
                            </p>
                            <p>
                              <strong>Phone:</strong>{' '}
                              {shop.phone || shop.owner?.phone || 'N/A'}
                            </p>
                            <p>
                              <strong>Cuisine:</strong> {shop.cuisine || 'Multi-Cuisine'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleVendorStatus(shop._id, 'approved')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                          >
                            <CheckCircle2 size={16} /> Approve Restaurant
                          </button>
                          <button
                            onClick={() => handleVendorStatus(shop._id, 'rejected')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition cursor-pointer"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Approved & Rejected Restaurants */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-extrabold text-gray-900 mb-4">
                  Reviewed Restaurants (Approved &amp; Rejected)
                </h2>

                {reviewedShops.length === 0 ? (
                  <p className="text-sm text-gray-500">No reviewed restaurants yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                          <th className="py-3 px-4">Restaurant</th>
                          <th className="py-3 px-4">Owner</th>
                          <th className="py-3 px-4">Address</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-sm">
                        {reviewedShops.map((shop) => (
                          <tr key={shop._id} className="hover:bg-gray-50">
                            <td className="py-3.5 px-4 font-bold text-gray-900">
                              {shop.name}
                              {shop.rating > 0 && (
                                <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  ★ {shop.rating} ({shop.numReviews})
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">
                              {shop.owner?.name} ({shop.owner?.email})
                            </td>
                            <td className="py-3.5 px-4 text-gray-600">{shop.address}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                  shop.status === 'approved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {shop.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right space-x-2">
                              {shop.status !== 'approved' && (
                                <button
                                  onClick={() => handleVendorStatus(shop._id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {shop.status !== 'rejected' && (
                                <button
                                  onClick={() => handleVendorStatus(shop._id, 'rejected')}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-extrabold text-gray-900">
                Manage Food Categories
              </h2>
              <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
                <input
                  type="text"
                  placeholder="New category name..."
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Plus size={16} /> Add
                </button>
              </form>

              <div className="flex flex-wrap gap-3">
                {stats.categories.map((cat) => (
                  <div
                    key={cat._id}
                    className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl text-sm font-semibold text-gray-800"
                  >
                    <span>{cat.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(cat._id)}
                      className="text-gray-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-gray-900 mb-4">All Orders</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Restaurant</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Food Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.orders.map((o) => (
                      <tr key={o._id}>
                        <td className="py-3 px-4 font-mono text-xs">
                          #{o._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="py-3 px-4">{o.customer?.name || 'Customer'}</td>
                        <td className="py-3 px-4">{o.shop?.name || 'Restaurant'}</td>
                        <td className="py-3 px-4 font-bold">₹{o.totalAmount}</td>
                        <td className="py-3 px-4 uppercase text-xs font-bold">
                          {o.status}
                        </td>
                        <td className="py-3 px-4">
                          {o.rating ? (
                            <span className="text-amber-600 font-bold">
                              ★ {o.rating}/5 {o.review ? `("${o.review}")` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Not rated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: USERS */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-gray-900 mb-4">
                Registered Users
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.users.map((u) => (
                      <tr key={u._id}>
                        <td className="py-3 px-4 font-bold">{u.name}</td>
                        <td className="py-3 px-4">{u.email}</td>
                        <td className="py-3 px-4">{u.phone || '-'}</td>
                        <td className="py-3 px-4 uppercase text-xs font-bold">
                          {u.role}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;