import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  LogOut,
  Store,
  Bike,
  Shield,
  ClipboardList,
  UserCog,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { updateProfile } from '../../api/authApi';

const Navbar = ({ toggleCart, onOpenOrders }) => {
  const { user, logout, setUser } = useAuth();
  const { cartCount, toggleCart: contextToggleCart } = useCart();
  const navigate = useNavigate();

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const role = (user?.role || '').toLowerCase();

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
      const { data } = await updateProfile({ name: profileName, phone: profilePhone });
      // Keep existing tokens intact while patching updated info
      const updatedUser = { ...user, ...data };
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowProfileModal(false);
      alert('Profile updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
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

            <div className="flex items-center gap-3">
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-50"
                >
                  <Shield size={16} /> Admin Panel
                </Link>
              )}

              {role === 'owner' && (
                <Link
                  to="/owner"
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-700 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-orange-50"
                >
                  <Store size={16} /> Owner Dashboard
                </Link>
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
                <div className="flex items-center gap-3 border-l border-gray-200 pl-3 ml-1">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-gray-400 uppercase font-semibold">
                      {role}
                    </p>
                  </div>
                  
                  {/* Profile Edit Button: Specifically for Customer and Rider */}
                  {(role === 'customer' || role === 'rider') && (
                    <button
                      onClick={handleOpenProfile}
                      className="p-2 text-gray-500 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 rounded-xl cursor-pointer transition"
                      title="Update Profile Settings"
                    >
                      <UserCog size={18} />
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
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

      {/* Global Profile Settings Modal */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
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