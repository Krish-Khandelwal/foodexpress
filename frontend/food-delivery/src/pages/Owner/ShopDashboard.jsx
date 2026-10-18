import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function ShopDashboard() {
  const [shop, setShop] = useState({
    name: '',
    address: '',
    phone: '',
    cuisine: '',
    description: '',
    image: '',
  });
  const [showShopModal, setShowShopModal] = useState(false);
  const [showOrdersWindow, setShowOrdersWindow] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pickupOtpInputs, setPickupOtpInputs] = useState({});

  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    image: '',
    isAvailable: true,
  });

  useEffect(() => {
    fetchShop();
    fetchOrders();
    fetchMenu();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchShop = async () => {
    try {
      const { data } = await api.get('/auth/my-shop');
      if (data) setShop(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/owner-orders');
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/menu/my-menu');
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShopImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setShop((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveShop = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/auth/my-shop', shop);
      setShop(data.shop);
      setShowShopModal(false);
      alert('Restaurant details updated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save restaurant');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleVerifyRiderOtp = async (orderId) => {
    const otp = pickupOtpInputs[orderId];
    if (!otp) return alert('Please enter the OTP from the delivery rider');
    try {
      await api.post(`/orders/${orderId}/verify-pickup-otp`, { otp });
      alert('OTP verified! Status updated to Out for Delivery.');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid Rider OTP');
    }
  };

  const handleFoodFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFoodForm((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem._id}`, foodForm);
        alert('Food item updated!');
      } else {
        await api.post('/menu', foodForm);
        alert('Food item uploaded & saved!');
      }
      setEditingItem(null);
      setFoodForm({
        name: '',
        description: '',
        price: '',
        category: 'Main Course',
        image: '',
        isAvailable: true,
      });
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving food item');
    } finally {
      setUploading(false);
    }
  };

  const startEditFood = (item) => {
    setEditingItem(item);
    setFoodForm({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category || 'Main Course',
      image: item.image || item.imageUrl || '',
      isAvailable: item.isAvailable ?? true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteFood = async (id) => {
    if (!window.confirm('Delete this food item?')) return;
    try {
      await api.delete(`/menu/${id}`);
      fetchMenu();
    } catch {
      alert('Failed to delete item');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Top Bar: Restaurant Details */}
      <div className="flex flex-wrap justify-between items-center bg-white p-6 rounded-lg shadow-xs border mb-6">
        <div>
          <h1 className="text-2xl font-bold">{shop?.name || 'My Restaurant'}</h1>
          <p className="text-gray-600">
            {shop?.address || 'No address set'} • {shop?.cuisine || 'Multi-Cuisine'}
          </p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => setShowShopModal(true)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100 cursor-pointer"
          >
            Edit Restaurant Details
          </button>
          <button
            onClick={() => setShowOrdersWindow(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-semibold shadow-xs cursor-pointer"
          >
            Current Orders ({orders.filter((o) => o.status !== 'delivered').length})
          </button>
        </div>
      </div>

      {/* Add/Edit Food Form */}
      <form onSubmit={handleSaveFood} className="bg-white p-6 rounded-lg shadow-xs mb-8 border">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          {editingItem ? `Edit Food Item: ${editingItem.name}` : 'Add New Food Item'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Food Name *"
            required
            className="p-2.5 border rounded-lg"
            value={foodForm.name}
            onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })}
          />

          <input
            type="number"
            placeholder="Price (₹) *"
            required
            className="p-2.5 border rounded-lg"
            value={foodForm.price}
            onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })}
          />

          <input
            type="text"
            placeholder="Category (e.g. Starter, Main Course)"
            className="p-2.5 border rounded-lg"
            value={foodForm.category}
            onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleFoodFileChange}
            className="p-2 border rounded-lg bg-white"
          />
        </div>

        <textarea
          placeholder="Food Description"
          className="w-full p-2.5 border rounded-lg mt-4"
          rows={2}
          value={foodForm.description}
          onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })}
        />

        {foodForm.image && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
            <img
              src={foodForm.image}
              alt="Preview"
              className="w-24 h-24 object-cover rounded border"
            />
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            type="submit"
            disabled={uploading}
            className="px-5 py-2.5 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
          >
            {uploading
              ? 'Saving Food Item...'
              : editingItem
              ? 'Update Food Item'
              : 'Add Food Item'}
          </button>
          {editingItem && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setFoodForm({
                  name: '',
                  description: '',
                  price: '',
                  category: 'Main Course',
                  image: '',
                  isAvailable: true,
                });
              }}
              className="px-4 py-2 bg-gray-200 rounded-lg cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Existing Menu Items */}
      <h3 className="text-xl font-bold mb-4">Your Active Menu</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {menuItems.length === 0 ? (
          <p className="text-gray-500">No food items added yet.</p>
        ) : (
          menuItems.map((item) => (
            <div
              key={item._id}
              className="border rounded-lg p-4 shadow-xs bg-white flex flex-col justify-between"
            >
              <div>
                <img
                  src={
                    item.image ||
                    item.imageUrl ||
                    'https://placehold.co/300x180?text=No+Image'
                  }
                  alt={item.name}
                  className="w-full h-40 object-cover rounded mb-3"
                />
                <h4 className="font-bold text-lg">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="mt-2 font-semibold text-orange-600">
                  ₹{item.price} • {item.category}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => startEditFood(item)}
                  className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm font-semibold cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteFood(item._id)}
                  className="py-1.5 px-3 bg-red-100 text-red-600 rounded text-sm font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Shop Modal */}
      {showShopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveShop}
            className="bg-white p-6 rounded-lg w-full max-w-md space-y-3"
          >
            <h3 className="text-xl font-bold">Edit Restaurant Profile</h3>
            <input
              type="text"
              placeholder="Restaurant Name *"
              required
              className="w-full p-2 border rounded"
              value={shop.name || ''}
              onChange={(e) => setShop({ ...shop, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address *"
              required
              className="w-full p-2 border rounded"
              value={shop.address || ''}
              onChange={(e) => setShop({ ...shop, address: e.target.value })}
            />
            <input
              type="text"
              placeholder="Phone"
              className="w-full p-2 border rounded"
              value={shop.phone || ''}
              onChange={(e) => setShop({ ...shop, phone: e.target.value })}
            />
            <input
              type="text"
              placeholder="Cuisine"
              className="w-full p-2 border rounded"
              value={shop.cuisine || ''}
              onChange={(e) => setShop({ ...shop, cuisine: e.target.value })}
            />
            <textarea
              placeholder="Description"
              className="w-full p-2 border rounded"
              value={shop.description || ''}
              onChange={(e) => setShop({ ...shop, description: e.target.value })}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleShopImageChange}
              className="w-full text-sm"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowShopModal(false)}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded">
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersWindow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold">Current & Recent Orders</h2>
              <button
                onClick={() => setShowOrdersWindow(false)}
                className="px-3 py-1 bg-red-100 text-red-700 font-bold rounded cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">No orders yet.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="border rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4 bg-gray-50"
                  >
                    <div>
                      <p className="font-bold text-lg">Order #{order._id.slice(-6)}</p>
                      <p className="text-sm">
                        Customer: {order.customer?.name} ({order.customer?.phone})
                      </p>
                      <p className="text-sm text-gray-600">Address: {order.deliveryAddress}</p>
                      <p className="text-sm mt-1 bg-white p-2 rounded border">
                        Items: {order.items.map((i) => `${i.name} x${i.quantity}`).join(', ')} —{' '}
                        <strong className="text-orange-600">₹{order.totalAmount}</strong>
                      </p>
                      {order.rider && (
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          Rider Assigned: {order.rider.name} ({order.rider.phone})
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between min-w-[200px]">
                      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-orange-200 text-orange-800">
                        {order.status}
                      </span>

                      {['pending', 'preparing', 'ready'].includes(order.status) && (
                        <div className="mt-3 w-full">
                          <label className="text-xs text-gray-500 block mb-1">Update Status:</label>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order._id, e.target.value)}
                            className="border rounded w-full p-2 text-sm bg-white"
                          >
                            <option value="pending">Pending</option>
                            <option value="preparing">Preparing</option>
                            <option value="ready">Ready</option>
                          </select>
                        </div>
                      )}

                      {order.status === 'ready' && (
                        <div className="mt-4 flex flex-col gap-2 w-full">
                          <input
                            type="text"
                            placeholder="Enter Rider OTP"
                            className="border rounded px-2 py-2 text-sm w-full font-mono text-center tracking-widest bg-white"
                            value={pickupOtpInputs[order._id] || ''}
                            onChange={(e) =>
                              setPickupOtpInputs({
                                ...pickupOtpInputs,
                                [order._id]: e.target.value,
                              })
                            }
                          />
                          <button
                            onClick={() => handleVerifyRiderOtp(order._id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm w-full font-bold transition cursor-pointer"
                          >
                            Verify OTP & Handover
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}