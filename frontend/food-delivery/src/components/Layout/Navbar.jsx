import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  LogOut,
  Package,
  Store,
  Truck,
  ShieldCheck,
  Home as HomeIcon,
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';

const Navbar = ({ toggleCart }) => {
  const { user, logout } = useContext(AuthContext);
  const { cart = [], cartCount = 0 } = useContext(CartContext);
  const navigate = useNavigate();
  const location = useLocation();

  const role = user?.role?.toLowerCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-xs border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-2xl font-black text-orange-600 tracking-tight">
              FoodExpress
            </Link>

            {/* Top Home Button for Customer */}
            {user && role === 'customer' && location.pathname !== '/' && (
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 text-sm font-bold transition"
              >
                <HomeIcon size={16} />
                <span>Home</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {role === 'customer' && (
                  <>
                    <Link
                      to="/"
                      className={`flex items-center gap-1.5 text-sm font-semibold transition ${
                        location.pathname === '/'
                          ? 'text-orange-600'
                          : 'text-gray-700 hover:text-orange-600'
                      }`}
                    >
                      <HomeIcon size={18} />
                      <span className="hidden sm:inline">Home</span>
                    </Link>

                    <Link
                      to="/track-order/latest"
                      className={`flex items-center gap-1.5 text-sm font-semibold transition ${
                        location.pathname.startsWith('/track-order')
                          ? 'text-orange-600'
                          : 'text-gray-700 hover:text-orange-600'
                      }`}
                    >
                      <Package size={18} />
                      <span className="hidden sm:inline">My Orders</span>
                    </Link>

                    <button
                      onClick={toggleCart}
                      className="relative p-2 text-gray-600 hover:text-orange-600 transition cursor-pointer"
                      aria-label="Open Cart"
                    >
                      <ShoppingBag size={24} />
                      {(cartCount || cart.length) > 0 && (
                        <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                          {cartCount || cart.length}
                        </span>
                      )}
                    </button>
                  </>
                )}

                {role === 'owner' && (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/owner-dashboard"
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <Store size={18} />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/manage-menu"
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-100"
                    >
                      Manage Menu
                    </Link>
                  </div>
                )}

                {role === 'rider' && (
                  <Link
                    to="/delivery-dashboard"
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-orange-600"
                  >
                    <Truck size={18} />
                    <span>Deliveries</span>
                  </Link>
                )}

                {role === 'admin' && (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/admin-dashboard"
                      className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-orange-600"
                    >
                      <ShieldCheck size={18} />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/admin"
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-sm font-semibold hover:bg-orange-100"
                    >
                      Vendor Approvals
                    </Link>
                  </div>
                )}

                <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-1">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
                    <p className="text-[11px] uppercase text-gray-400 font-semibold">{role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 text-gray-500 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-full transition cursor-pointer"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="bg-orange-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-orange-700 transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="border border-orange-600 text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition hidden sm:inline-block"
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