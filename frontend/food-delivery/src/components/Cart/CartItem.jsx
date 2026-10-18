import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

const CartItem = ({ item, onUpdate, onRemove }) => {
  const itemId = item.menuItem || item._id;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col">
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-gray-800">{item.name}</h3>
        <button
          onClick={() => onRemove(itemId)}
          className="text-gray-400 hover:text-red-500 transition"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <p className="text-gray-600 font-medium mt-1">₹{item.price}</p>

      <div className="flex items-center gap-3 mt-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
        <button
          onClick={() => onUpdate(itemId, -1)}
          className="p-1 text-gray-600 hover:text-orange-600"
        >
          <Minus size={16} />
        </button>
        <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
        <button
          onClick={() => onUpdate(itemId, 1)}
          className="p-1 text-gray-600 hover:text-orange-600"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default CartItem;