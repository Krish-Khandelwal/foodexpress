import React, { useContext, useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, MapPin } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';

const CartDrawer = ({ isOpen, onClose }) => {
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [isProcessing, setIsProcessing] = useState(false);

  const deliveryFee = cartTotal > 0 ? 40 : 0;
  const taxes = cartTotal > 0 ? Math.round(cartTotal * 0.05) : 0;
  const finalTotal = cartTotal + deliveryFee + taxes;

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      // Mocking successful checkout logic without Razorpay
      const orderPayload = {
        shopId: cartItems[0]?.shopId || '60d21b4667d0d8992e610c85',
        items: cartItems,
        totalAmount: finalTotal,
        deliveryAddress: { street: 'Uttam Nagar East', lat: 28.6189, lng: 77.0544 }
      };
      const { data } = await api.post('/orders', orderPayload);
      alert(`TEST PAYMENT SUCCESSFUL! Order ID: ${data.order._id}`);
      clearCart();
      window.location.href = `/track-order/${data.order._id}`;
    } catch (error) {
      console.error('Checkout Error:', error);
      alert('Error placing order.');
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShoppingBag size={24} className="text-blue-600" /> Your Order</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {cartItems.length === 0 ? (
            <div className="text-center text-gray-500 mt-20">Cart is empty</div>
          ) : (
            cartItems.map((item) => (
              <div key={item._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex-col">
                <div className="flex justify-between">
                  <h3 className="font-semibold text-gray-800">{item.name}</h3>
                  <button onClick={() => removeFromCart(item._id)} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
                <p className="text-gray-600 font-medium mt-1">₹{item.price}</p>
                <div className="flex items-center gap-3 mt-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
                  <button onClick={() => updateQuantity(item._id, -1)} className="p-1 text-gray-600"><Minus size={16} /></button>
                  <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item._id, 1)} className="p-1 text-gray-600"><Plus size={16} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="p-5 bg-white border-t border-gray-200">
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-gray-800">₹{cartTotal}</span></div>
              <div className="flex justify-between"><span>Taxes</span><span className="font-medium text-gray-800">₹{taxes}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span className="font-medium text-gray-800">₹{deliveryFee}</span></div>
            </div>
            <button onClick={handleCheckout} disabled={isProcessing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700">
              {isProcessing ? 'Processing...' : `Pay ₹${finalTotal}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
export default CartDrawer;