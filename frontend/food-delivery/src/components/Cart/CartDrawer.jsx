import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export default function CartDrawer({ isOpen, onClose }) {
  const { cart = [], updateQuantity, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-gray-500 hover:text-red-500 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-4xl mb-3">🛒</span>
              <p className="font-medium">Your cart is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.menuItem}
                  className="flex justify-between items-center border-b pb-3 gap-2"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image || 'https://placehold.co/60x60?text=Food'}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-lg border"
                    />
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{item.name}</p>
                      {item.shopName && (
                        <p className="text-[11px] text-orange-600 font-medium">
                          {item.shopName}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">₹{item.price} each</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => updateQuantity(item.menuItem, -1)}
                          className="p-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItem, 1)}
                          className="p-1 bg-gray-100 rounded hover:bg-gray-200 cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-bold text-gray-800">
                      ₹{item.price * item.quantity}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.menuItem)}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between font-bold text-xl mb-4 text-gray-800">
              <span>Total:</span>
              <span className="text-orange-600">₹{cartTotal}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 shadow-xs transition cursor-pointer"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}