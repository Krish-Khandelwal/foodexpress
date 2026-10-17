import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useCart } from '../../context/CartContext'; // Adjust path if needed

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const [menuItems, setMenuItems] = useState([]);
  const { addToCart } = useCart(); // Assuming you have a cart context

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/menu`);
        setMenuItems(data);
      } catch (err) {
        console.error('Failed to load menu:', err);
      }
    };
    fetchMenu();
  }, []);

  const handleAddToCart = (item) => {
    addToCart({
      menuItem: item._id,
      name: item.name,
      price: item.price,
      // Fix: Ensure we grab either image or imageUrl properly
      image: item.image || item.imageUrl || '',
      quantity: 1,
      shopId: item.shop?._id
    });
    alert(`${item.name} added to cart!`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-orange-600">Welcome to FoodExpress</h1>
      
      {menuItems.length === 0 ? (
        <p className="text-center text-gray-500 text-lg mt-10">Loading delicious food...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menuItems.map((item) => (
            <div key={item._id} className="border rounded-xl shadow-md overflow-hidden bg-white hover:shadow-lg transition">
              {/* Fix: Display image using both property names to catch Cloudinary URLs */}
              <img
                src={item.image || item.imageUrl || 'https://via.placeholder.com/300x200?text=FoodExpress'}
                alt={item.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 h-10 overflow-hidden">{item.description}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className="font-bold text-lg">₹{item.price}</span>
                  <button 
                    onClick={() => handleAddToCart(item)}
                    className="bg-orange-600 text-white px-4 py-2 rounded font-semibold hover:bg-orange-700"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                  From: {item.shop?.name || 'FoodExpress Restaurant'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}