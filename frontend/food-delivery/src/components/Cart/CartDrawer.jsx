import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, X, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';

const CartDrawer = ({ isOpen, onClose }) => {
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeFromCart,
    cartTotal,
  } = useCart();
  const navigate = useNavigate();

  const drawerOpen = isOpen !== undefined ? isOpen : isCartOpen;
  const handleClose = () => {
    if (onClose) onClose();
    setIsCartOpen(false);
  };

  const deliveryFee = cartTotal > 0 ? 40 : 0;
  const taxes = cartTotal > 0 ? Math.round(cartTotal * 0.05) : 0;
  const finalAmount = cartTotal + deliveryFee + taxes;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          drawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={handleClose}
      />

      <div
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-gray-900">
            <ShoppingBag size={22} className="text-orange-600" /> Your Cart
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">
              Your cart is empty
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item._id}
                className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    {item.shopName && (
                      <p className="text-xs text-gray-400">{item.shopName}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <p className="text-gray-800 font-bold mt-1">₹{item.price}</p>

                <div className="flex items-center gap-3 mt-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
                  <button
                    onClick={() => updateQuantity(item._id, -1)}
                    className="p-1 text-gray-600 hover:text-orange-600 cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item._id, 1)}
                    className="p-1 text-gray-600 hover:text-orange-600 cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 bg-white border-t border-gray-200 space-y-4">
            <div className="space-y-1.5 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-gray-800">₹{cartTotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Taxes (5%)</span>
                <span className="font-semibold text-gray-800">₹{taxes}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-semibold text-gray-800">₹{deliveryFee}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t">
                <span>Total</span>
                <span>₹{finalAmount}</span>
              </div>
            </div>

            <button
              onClick={() => {
                handleClose();
                navigate('/checkout');
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl cursor-pointer text-sm shadow-sm transition"
            >
              Proceed to Checkout • ₹{finalAmount}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;