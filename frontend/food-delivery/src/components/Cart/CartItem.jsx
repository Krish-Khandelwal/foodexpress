import React from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';

const CartItem = ({ item, onUpdate, onRemove }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex-col">
      <div className="flex justify-between">
        <h3 className="font-semibold text-gray-800">{item.name}</h3>
        <button onClick={() => onRemove(item._id)} className="text-gray-400 hover:text-red-500">
          <Trash2 size={18} />
        </button>
      </div>
      <p className="text-gray-600 font-medium mt-1">₹{item.price}</p>
      
      <div className="flex items-center gap-3 mt-3 bg-gray-50 w-fit rounded-lg border border-gray-200 p-1">
        <button onClick={() => onUpdate(item._id, -1)} className="p-1 text-gray-600">
          <Minus size={16} />
        </button>
        <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
        <button onClick={() => onUpdate(item._id, 1)} className="p-1 text-gray-600">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

export default CartItem;