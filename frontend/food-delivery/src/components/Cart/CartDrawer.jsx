import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext'; // Adjust path if needed

export default function CartDrawer({ isOpen, onClose }) {
  // 1. FIXED: Added a default empty array to cart so it is never undefined
  const { cart = [], removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout'); // Ensure you have a checkout route in App.jsx
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 transition-opacity">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-600 hover:text-red-500">
            ✕
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 2. FIXED: Using optional chaining cart?.length just to be extra safe */}
          {cart?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-4xl mb-3">🛒</span>
              <p>Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b pb-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={item.image || 'https://via.placeholder.com/60'} 
                      alt={item.name} 
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">₹{item.price} x {item.quantity}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-gray-800">₹{item.price * item.quantity}</span>
                    <button 
                      onClick={() => removeFromCart(item.menuItem)} 
                      className="text-red-500 text-xs font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Checkout Button */}
        {cart?.length > 0 && (
          <div className="p-4 border-t bg-gray-50 shadow-inner">
            <div className="flex justify-between font-bold text-xl mb-4 text-gray-800">
              <span>Total:</span>
              <span className="text-orange-600">₹{cartTotal}</span>
            </div>
            <button 
              onClick={handleCheckout} 
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow transition"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}