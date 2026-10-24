import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  Utensils,
  Star,
  Search,
  ShoppingBag,
  XCircle,
  MapPin,
  Clock,
  ClipboardList,
  X,
} from 'lucide-react';
import API from '../../api/axios';
import { CartContext } from '../../context/CartContext';
import { AuthContext } from '../../context/AuthContext';

const Home = ({ showOrdersModal = false, setShowOrdersModal }) => {
  const [shops, setShops] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [localOrdersOpen, setLocalOrdersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [ratingModalOrder, setRatingModalOrder] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState('');

  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const isOrdersOpen = showOrdersModal || localOrdersOpen;
  const closeOrdersModal = () => {
    setLocalOrdersOpen(false);
    if (setShowOrdersModal) setShowOrdersModal(false);
  };
  const openOrdersModal = () => {
    setLocalOrdersOpen(true);
    if (setShowOrdersModal) setShowOrdersModal(true);
  };

  const fetchHomeData = async () => {
    try {
      const [shopsRes, menuRes] = await Promise.all([
        API.get('/menu/shops'),
        API.get('/menu'),
      ]);
      setShops(shopsRes.data || []);
      setMenuItems(menuRes.data || []);

      if (user) {
        const ordersRes = await API.get('/orders/my-orders');
        setMyOrders(ordersRes.data || []);
      }
    } catch (err) {
      console.error('Error loading home data:', err);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [user]);

  const handleSelectShop = async (shop) => {
    setSelectedShop(shop);
    try {
      const { data } = await API.get(`/menu/shops/${shop._id}/menu`);
      setMenuItems(data || []);
    } catch (err) {
      console.error('Error fetching shop menu:', err);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await API.put(`/orders/${orderId}/cancel`, {
        reason: 'Cancelled by customer',
      });
      fetchHomeData();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel order');
    }
  };

  const handleQuickRateSubmit = async (e) => {
    e.preventDefault();
    if (!ratingModalOrder) return;
    try {
      await API.post(`/orders/${ratingModalOrder._id}/rate`, {
        rating: ratingValue,
        review: ratingReview,
      });
      setRatingModalOrder(null);
      setRatingReview('');
      fetchHomeData();
      alert('Thank you for rating the food quality!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit rating');
    }
  };

  const filteredMenu = menuItems.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-8">
      {/* Top Action Bar with Recent/My Orders Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
          <ShoppingBag size={18} className="text-orange-600" />
          <span>Order fresh food from 1 restaurant at a time</span>
        </div>
        <button
          onClick={openOrdersModal}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm cursor-pointer transition"
        >
          <ClipboardList size={17} />
          Your Recent Orders ({myOrders.length})
        </button>
      </div>

      {/* Hero & Search */}
      <div className="bg-linear-to-r from-orange-600 to-amber-500 rounded-3xl p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <span className="bg-white/20 text-white text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            One Restaurant Per Order • Fast Live Tracking
          </span>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            Delicious Food, Delivered Fresh to Your Door
          </h1>
          <p className="text-white/90 text-sm">
            Choose from verified restaurants, track your rider live on the map, and rate your meal quality.
          </p>
        </div>

        <div className="w-full md:w-80 bg-white rounded-2xl p-2 flex items-center shadow-md">
          <Search size={18} className="text-gray-400 ml-2" />
          <input
            type="text"
            placeholder="Search dishes or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm text-gray-800 focus:outline-none"
          />
        </div>
      </div>

      {/* Restaurants Section */}
      {!selectedShop ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-extrabold text-gray-900">
            Approved Restaurants
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((shop) => (
              <div
                key={shop._id}
                onClick={() => handleSelectShop(shop)}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-extrabold text-gray-900">
                      {shop.name || shop.shopName}
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Star size={12} className="fill-amber-500 text-amber-500" />
                      {shop.rating > 0 ? `${shop.rating} (${shop.numReviews})` : 'New'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <MapPin size={13} /> {shop.address}
                  </p>
                  <p className="text-xs text-orange-600 font-semibold mt-2">
                    {shop.cuisine || 'Multi-Cuisine'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> 25–35 mins
                  </span>
                  <span className="text-orange-600 font-bold">View Menu →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => {
              setSelectedShop(null);
              fetchHomeData();
            }}
            className="text-orange-600 font-bold text-sm mb-4 hover:underline cursor-pointer"
          >
            ← Back to All Restaurants
          </button>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            {selectedShop.name || selectedShop.shopName} — Menu
          </h2>
          <p className="text-xs text-gray-500 mb-6">{selectedShop.address}</p>
        </div>
      )}

      {/* Food Items Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-extrabold text-gray-900">
          {selectedShop ? 'Available Dishes' : 'Popular Dishes'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenu.map((item) => {
            const itemShopId =
              item.shop?._id || item.shop || selectedShop?._id;
            const itemShopName =
              item.shop?.name || selectedShop?.name || 'Restaurant';

            return (
              <div
                key={item._id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center gap-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.image || item.imageUrl ? (
                    <img
                      src={item.image || item.imageUrl}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-orange-50 rounded-xl border border-orange-100 flex items-center justify-center text-orange-400 shrink-0">
                      <Utensils size={24} />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          item.isVeg === false ? 'bg-red-500' : 'bg-emerald-600'
                        }`}
                      />
                      <h4 className="font-bold text-gray-900 truncate">
                        {item.name}
                      </h4>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {itemShopName}
                    </p>
                    {item.rating > 0 && (
                      <p className="text-xs text-amber-600 font-bold mt-0.5">
                        ★ {item.rating} ({item.numReviews})
                      </p>
                    )}
                    <p className="font-extrabold text-gray-900 mt-1">
                      ₹{item.price}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() =>
                    addToCart({
                      ...item,
                      shopId: itemShopId,
                      shopName: itemShopName,
                    })
                  }
                  className="bg-orange-50 text-orange-600 font-extrabold px-4 py-2 rounded-xl border border-orange-200 hover:bg-orange-600 hover:text-white transition cursor-pointer shrink-0"
                >
                  ADD
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Button Modal: Your Recent Orders */}
      {isOrdersOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <ClipboardList size={22} className="text-orange-600" /> Your Recent Orders
              </h2>
              <button
                onClick={closeOrdersModal}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {myOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-12">
                  You haven&apos;t placed any orders yet.
                </p>
              ) : (
                myOrders.map((ord) => (
                  <div
                    key={ord._id}
                    className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-mono text-gray-400">
                          #{ord._id.slice(-6).toUpperCase()}
                        </span>
                        <h4 className="font-bold text-gray-900">
                          {ord.shop?.name || 'Restaurant'}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ord.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                      <span className="font-extrabold text-gray-900">
                        ₹{ord.totalAmount}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/track-order/${ord._id}`}
                          onClick={closeOrdersModal}
                          className="bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-bold px-3 py-1.5 rounded-lg"
                        >
                          Track / Details
                        </Link>

                        {ord.status !== 'delivered' && ord.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelOrder(ord._id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle size={13} /> Cancel
                          </button>
                        )}

                        {ord.status !== 'cancelled' && !ord.rating && (
                          <button
                            onClick={() => {
                              setRatingModalOrder(ord);
                              setRatingValue(5);
                              setRatingReview('');
                            }}
                            className="bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <Star size={13} /> Rate Food
                          </button>
                        )}

                        {ord.rating && (
                          <span className="text-xs font-bold text-amber-600">
                            ★ {ord.rating}/5 Rated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Rating Modal */}
      {ratingModalOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-extrabold text-gray-900">
              Rate Food Quality — {ratingModalOrder.shop?.name}
            </h3>
            <form onSubmit={handleQuickRateSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      size={28}
                      className={
                        star <= ratingValue
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-gray-300'
                      }
                    />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Share your experience with the food quality..."
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRatingModalOrder(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;