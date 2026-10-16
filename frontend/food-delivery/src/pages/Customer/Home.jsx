import React, { useState, useEffect, useContext } from 'react';
import { Utensils } from 'lucide-react';
import { CartContext } from '../../context/CartContext';
import api from '../../api/axios';

const Home = ({ toggleCart }) => {
  const [shops, setShops] = useState([]);
  const [selectedShopMenu, setSelectedShopMenu] = useState([]);
  const [activeShop, setActiveShop] = useState(null);
  const { addToCart } = useContext(CartContext);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const { data } = await api.get('/menu/shops');
        setShops(data);
      } catch (err) {
        console.error("Error fetching shops", err);
      }
    };
    fetchShops();
  }, []);

  const loadMenu = async (shop) => {
    setActiveShop(shop);
    try {
      const { data } = await api.get(`/menu/shops/${shop._id}/menu`);
      setSelectedShopMenu(data);
    } catch (err) {
      console.error("Error fetching menu", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {!activeShop ? (
        <>
          <h1 className="text-3xl font-bold mb-8">What are you craving?</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <div key={shop._id} onClick={() => loadMenu(shop)} className="bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition">
                <h3 className="text-xl font-bold">{shop.shopName}</h3>
                <p className="text-sm text-gray-500 mt-1">{shop.address}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div>
          <button onClick={() => setActiveShop(null)} className="text-blue-600 font-medium mb-4 hover:underline">&larr; Back to Restaurants</button>
          <h2 className="text-2xl font-bold mb-6">{activeShop.shopName} - Menu</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedShopMenu.map((item) => (
              <div key={item._id} className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center gap-4 hover:shadow-md transition">
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.imageUrl ? (
                    <img 
                      src={item.imageUrl} 
                      alt={item.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-200 flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                      <Utensils size={24} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.category === 'NON_VEG' 
                          ? 'bg-red-500' 
                          : item.category === 'BEVERAGE' 
                            ? 'bg-blue-500' 
                            : item.category === 'DESSERT' 
                              ? 'bg-amber-500' 
                              : 'bg-green-500'
                      }`} />
                      <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mb-1">{item.description}</p>
                    )}
                    <p className="font-bold text-gray-900">₹{item.price}</p>
                  </div>
                </div>
                <button 
                  onClick={() => addToCart({ ...item, shopId: activeShop._id })} 
                  className="bg-blue-50 text-blue-600 font-bold px-4 py-2 rounded-lg border border-blue-200 hover:bg-blue-600 hover:text-white transition cursor-pointer flex-shrink-0"
                >
                  ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default Home;