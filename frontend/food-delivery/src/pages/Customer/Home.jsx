import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useCart } from '../../context/CartContext';

export default function Home({ toggleCart }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const { data } = await api.get('/menu');
        setMenuItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const categories = ['All', ...new Set(menuItems.map((i) => i.category).filter(Boolean))];

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.shop?.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (item) => {
    addToCart({
      menuItem: item._id,
      name: item.name,
      price: item.price,
      image: item.image || item.imageUrl || '',
      quantity: 1,
      shopId: item.shop?._id,
      shopName: item.shop?.name,
    });
    if (toggleCart) toggleCart();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-orange-600 mb-2">
          Welcome to FoodExpress
        </h1>
        <p className="text-gray-600">Fresh, hot meals delivered straight to your door</p>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
        <input
          type="text"
          placeholder="Search dishes or restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-orange-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 text-lg mt-10 animate-pulse">
          Loading delicious food...
        </p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <p className="text-gray-500 text-lg">No food items available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="border border-gray-200 rounded-xl shadow-xs overflow-hidden bg-white hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <img
                  src={
                    item.image ||
                    item.imageUrl ||
                    'https://placehold.co/300x200?text=FoodExpress'
                  }
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2 min-h-[2.5rem]">
                    {item.description || 'Freshly prepared dish'}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-900">₹{item.price}</span>
                  <button
                    onClick={() => handleAddToCart(item)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t text-xs text-gray-500 truncate">
                  From: <span className="font-semibold">{item.shop?.name || 'FoodExpress Restaurant'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}