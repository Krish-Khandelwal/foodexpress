import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  LogOut,
  Store,
  Bike,
  Shield,
  ClipboardList,
  UserCog,
  X,
  IndianRupee,
  TrendingUp,
  Calendar,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import API from '../../api/axios';

const getMonthKey = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
};

// Helper: Calculate Restaurant Owner's share (Menu Items Subtotal + 5% Tax, excluding ₹40 delivery fee)
const getOwnerOrderAmounts = (order) => {
  let itemsSubtotal = 0;
  if (Array.isArray(order?.items) && order.items.length > 0) {
    itemsSubtotal = order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
      0
    );
  } else {
    const rawTotal = Number(order?.totalAmount) || 0;
    itemsSubtotal = rawTotal > 40 ? Math.round((rawTotal - 40) / 1.05) : rawTotal;
  }

  const taxAmount = Math.round(itemsSubtotal * 0.05);
  const ownerTotal = itemsSubtotal + taxAmount;

  return { itemsSubtotal, taxAmount, ownerTotal };
};

const Navbar = ({ toggleCart, onOpenOrders }) => {
  const { user, logout, setUser } = useAuth();
  const { cartCount, toggleCart: contextToggleCart } = useCart();
  const navigate = useNavigate();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Restaurant Owner Monthly Revenue States
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [ownerOrders, setOwnerOrders] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const currentMonthKey = useMemo(() => getMonthKey(new Date()), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  const role = (user?.role || '').toLowerCase();

  const fetchOwnerOrdersForRevenue = useCallback(async () => {
    if (!user || role !== 'owner') return;
    setLoadingRevenue(true);
    try {
      const { data } = await API.get('/orders/owner-orders');
      setOwnerOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch owner orders for revenue:', err);
    } finally {
      setLoadingRevenue(false);
    }
  }, [user, role]);

  useEffect(() => {
    if (user && role === 'owner') {
      fetchOwnerOrdersForRevenue();
      const interval = setInterval(fetchOwnerOrdersForRevenue, 10000);
      return () => clearInterval(interval);
    } else {
      setOwnerOrders([]);
    }
  }, [user, role, fetchOwnerOrdersForRevenue]);

  // Calculate Monthly Revenue Breakdown using Owner Total (Items Subtotal + 5% Tax)
  const revenueStats = useMemo(() => {
    const monthlyMap = {};

    if (currentMonthKey) {
      monthlyMap[currentMonthKey] = {
        monthKey: currentMonthKey,
        label: formatMonthLabel(currentMonthKey),
        totalRevenue: 0,
        deliveredRevenue: 0,
        activeRevenue: 0,
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        orders: [],
      };
    }

    let allTimeTotalRevenue = 0;
    let allTimeDeliveredRevenue = 0;

    for (const order of ownerOrders) {
      const mKey = getMonthKey(order.createdAt) || currentMonthKey;
      if (!monthlyMap[mKey]) {
        monthlyMap[mKey] = {
          monthKey: mKey,
          label: formatMonthLabel(mKey),
          totalRevenue: 0,
          deliveredRevenue: 0,
          activeRevenue: 0,
          totalOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          orders: [],
        };
      }

      const { itemsSubtotal, taxAmount, ownerTotal } = getOwnerOrderAmounts(order);
      const status = (order.status || '').toLowerCase();

      monthlyMap[mKey].orders.push({
        ...order,
        itemsSubtotal,
        taxAmount,
        ownerTotal,
      });

      if (status === 'cancelled') {
        monthlyMap[mKey].cancelledOrders += 1;
      } else {
        monthlyMap[mKey].totalOrders += 1;
        monthlyMap[mKey].totalRevenue += ownerTotal;
        allTimeTotalRevenue += ownerTotal;

        if (status === 'delivered') {
          monthlyMap[mKey].deliveredOrders += 1;
          monthlyMap[mKey].deliveredRevenue += ownerTotal;
          allTimeDeliveredRevenue += ownerTotal;
        } else {
          monthlyMap[mKey].activeRevenue += ownerTotal;
        }
      }
    }

    const monthlyList = Object.values(monthlyMap).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );

    const currentMonthData =
      monthlyMap[currentMonthKey] || {
        monthKey: currentMonthKey,
        label: formatMonthLabel(currentMonthKey),
        totalRevenue: 0,
        deliveredRevenue: 0,
        activeRevenue: 0,
        totalOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        orders: [],
      };

    const selectedMonthData =
      monthlyMap[selectedMonth] || currentMonthData;

    return {
      monthlyList,
      currentMonthData,
      selectedMonthData,
      allTimeTotalRevenue,
      allTimeDeliveredRevenue,
    };
  }, [ownerOrders, currentMonthKey, selectedMonth]);

  const handleOpenRevenueModal = () => {
    setSelectedMonth(currentMonthKey);
    setShowRevenueModal(true);
    fetchOwnerOrdersForRevenue();
  };

  const handleCartClick = () => {
    if (toggleCart) {
      toggleCart();
    } else {
      contextToggleCart();
    }
  };

  const handleMyOrdersClick = () => {
    navigate('/');
    if (onOpenOrders) {
      onOpenOrders();
    }
  };

  const handleOpenProfile = () => {
    setProfileName(user?.name || '');
    setProfilePhone(user?.phone || '');
    setShowProfileModal(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const { data } = await API.put('/auth/profile', {
        name: profileName,
        phone: profilePhone,
      });
      setUser((prev) => ({ ...prev, ...data }));
      setShowProfileModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to={user ? '/' : '/login'} className="flex items-center gap-2">
              <span className="text-2xl font-black text-orange-600 tracking-tight">
                FoodExpress
              </span>
              {role && role !== 'customer' && (
                <span className="bg-orange-100 text-orange-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                  {role}
                </span>
              )}
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-50"
                >
                  <Shield size={16} /> Admin Panel
                </Link>
              )}

              {role === 'owner' && (
                <>
                  <Link
                    to="/owner"
                    className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-50 transition"
                  >
                    <Store size={16} />
                    <span className="hidden md:inline">Owner Dashboard</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleOpenRevenueModal}
                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs sm:text-sm px-3 sm:px-3.5 py-2 rounded-xl cursor-pointer transition shadow-2xs"
                    title="View Monthly Revenue from Orders (Menu Subtotal + 5% Tax)"
                  >
                    <TrendingUp size={16} className="text-emerald-600 shrink-0" />
                    <span>Monthly Revenue</span>
                    <span className="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                      ₹{revenueStats.currentMonthData.totalRevenue.toLocaleString('en-IN')}
                    </span>
                  </button>
                </>
              )}

              {role === 'rider' && (
                <Link
                  to="/delivery"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-50"
                >
                  <Bike size={16} /> Deliveries
                </Link>
              )}

              {user && role === 'customer' && (
                <>
                  <button
                    onClick={handleMyOrdersClick}
                    className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl cursor-pointer transition"
                  >
                    <ClipboardList size={17} /> My Orders
                  </button>

                  <button
                    onClick={handleCartClick}
                    className="relative p-2.5 text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-xl cursor-pointer transition"
                    aria-label="Open cart"
                  >
                    <ShoppingBag size={22} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[11px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-3 border-l border-gray-200 pl-3 ml-1">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-gray-400 uppercase font-semibold">
                      {role}
                    </p>
                  </div>

                  {(role === 'customer' || role === 'rider' || role === 'owner') && (
                    <button
                      onClick={handleOpenProfile}
                      className="p-2 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-xl cursor-pointer transition"
                      title="Update Profile Settings"
                    >
                      <UserCog size={18} />
                    </button>
                  )}

                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-xl cursor-pointer transition"
                    title="Logout"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-700 transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Restaurant Owner Monthly Revenue Modal */}
      {showRevenueModal && role === 'owner' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-200 bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30">
                  <IndianRupee size={22} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold">
                    Monthly Revenue Report
                  </h2>
                  <p className="text-xs text-gray-300">
                    Calculated from Menu Item Subtotal + 5% Tax (Excludes ₹40 Rider Delivery Fee)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchOwnerOrdersForRevenue}
                  disabled={loadingRevenue}
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer transition disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={loadingRevenue ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevenueModal(false)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 bg-gray-50">
              {/* Top KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
                  <p className="text-[11px] font-extrabold uppercase text-emerald-700">
                    This Month ({revenueStats.currentMonthData.label})
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    ₹{revenueStats.currentMonthData.totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {revenueStats.currentMonthData.totalOrders} valid order(s)
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
                  <p className="text-[11px] font-extrabold uppercase text-blue-700">
                    Selected Month ({revenueStats.selectedMonthData.label})
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    ₹{revenueStats.selectedMonthData.totalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {revenueStats.selectedMonthData.totalOrders} order(s) •{' '}
                    {revenueStats.selectedMonthData.cancelledOrders} cancelled
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
                  <p className="text-[11px] font-extrabold uppercase text-amber-700">
                    Delivered Revenue ({revenueStats.selectedMonthData.label})
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    ₹{revenueStats.selectedMonthData.deliveredRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    From {revenueStats.selectedMonthData.deliveredOrders} delivered order(s)
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs">
                  <p className="text-[11px] font-extrabold uppercase text-purple-700">
                    All-Time Total Revenue
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    ₹{revenueStats.allTimeTotalRevenue.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Delivered: ₹{revenueStats.allTimeDeliveredRevenue.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Month Filter Selector */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-orange-600" />
                  <span className="text-sm font-extrabold text-gray-900">
                    Select Month to Inspect Orders:
                  </span>
                </div>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {revenueStats.monthlyList.map((m) => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.label} — ₹{m.totalRevenue.toLocaleString('en-IN')} ({m.totalOrders} orders)
                    </option>
                  ))}
                </select>
              </div>

              {/* Month-by-Month Revenue Breakdown Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Month-by-Month Revenue Summary
                  </h3>
                  <span className="text-xs text-gray-400">
                    Click any month row to filter orders below
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500">
                        <th className="py-3 px-4">Month</th>
                        <th className="py-3 px-4">Valid Orders</th>
                        <th className="py-3 px-4">Delivered</th>
                        <th className="py-3 px-4">In Progress Revenue</th>
                        <th className="py-3 px-4">Delivered Revenue</th>
                        <th className="py-3 px-4 text-right">Total Monthly Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {revenueStats.monthlyList.map((m) => {
                        const isSelected = m.monthKey === selectedMonth;
                        return (
                          <tr
                            key={m.monthKey}
                            onClick={() => setSelectedMonth(m.monthKey)}
                            className={`cursor-pointer transition ${
                              isSelected
                                ? 'bg-orange-50/80 font-semibold'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                              <span>{m.label}</span>
                              {m.monthKey === currentMonthKey && (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                                  Current
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-700">{m.totalOrders}</td>
                            <td className="py-3 px-4 text-emerald-700 font-semibold">
                              {m.deliveredOrders}
                            </td>
                            <td className="py-3 px-4 text-amber-700">
                              ₹{m.activeRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-emerald-700 font-bold">
                              ₹{m.deliveredRevenue.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-4 text-right font-black text-gray-900">
                              ₹{m.totalRevenue.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Orders in Selected Month */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">
                    Orders in {revenueStats.selectedMonthData.label} (
                    {revenueStats.selectedMonthData.orders.length})
                  </h3>
                  <span className="text-xs font-bold text-emerald-700">
                    Month Total: ₹
                    {revenueStats.selectedMonthData.totalRevenue.toLocaleString('en-IN')}
                  </span>
                </div>

                {revenueStats.selectedMonthData.orders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">
                    No orders recorded for {revenueStats.selectedMonthData.label}.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {revenueStats.selectedMonthData.orders.map((ord) => {
                      const isCancelled =
                        (ord.status || '').toLowerCase() === 'cancelled';
                      const isDelivered =
                        (ord.status || '').toLowerCase() === 'delivered';

                      return (
                        <div
                          key={ord._id}
                          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                            isCancelled
                              ? 'bg-red-50/40 border-red-200 opacity-75'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-500">
                                #{ord._id.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(ord.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                                  isDelivered
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isCancelled
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isDelivered ? (
                                  <CheckCircle2 size={11} />
                                ) : (
                                  <Clock size={11} />
                                )}
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-gray-800 mt-1">
                              {ord.customer?.name || 'Customer'} •{' '}
                              {ord.items
                                ?.map((i) => `${i.quantity}x ${i.name}`)
                                .join(', ')}
                            </p>
                          </div>

                          <div className="text-right">
                            <p
                              className={`text-base font-black ${
                                isCancelled
                                  ? 'line-through text-red-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              ₹{Number(ord.ownerTotal || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] font-semibold text-gray-500">
                              ₹{ord.itemsSubtotal} + ₹{ord.taxAmount} (5% tax) •{' '}
                              <span className="uppercase">{ord.paymentMethod || 'COD'}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-extrabold text-gray-900 mb-4 flex items-center gap-2">
              <UserCog size={22} className="text-orange-600" /> Update Profile
            </h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={updatingProfile}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-60 transition mt-2"
              >
                {updatingProfile ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;