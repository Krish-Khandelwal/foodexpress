import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  LogOut,
  Store,
  Bike,
  Shield,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

const Navbar = ({ toggleCart, onOpenOrders }) => {
  const { user, logout } = useAuth();
  const { cartCount, toggleCart: contextToggleCart } = useCart();
  const navigate = useNavigate();

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

  return (
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
  );
};

export default Navbar;