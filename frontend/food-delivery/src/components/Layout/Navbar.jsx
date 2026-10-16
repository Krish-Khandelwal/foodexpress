import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import { CartContext } from '../../context/CartContext';

const Navbar = ({ toggleCart }) => {
  const { user, logout } = useContext(AuthContext);
  const { cartItems } = useContext(CartContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-black text-blue-600 tracking-tighter">QuickBite</span>
            {user && user.role !== 'USER' && (
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded">{user.role}</span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === 'USER' && (
                  <button onClick={toggleCart} className="relative p-2 text-gray-600 hover:text-blue-600">
                    <ShoppingBag size={24} />
                    {cartItems.length > 0 && (
                      <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">{cartItems.length}</span>
                    )}
                  </button>
                )}
                <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-bold text-gray-800">{user.name}</p>
                  </div>
                  <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 rounded-full"><LogOut size={18} /></button>
                </div>
              </>
            ) : (
              <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700">Login</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
export default Navbar;