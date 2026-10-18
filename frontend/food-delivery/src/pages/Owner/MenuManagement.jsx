import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../../api/axios';

export default function ManageMenu() {
  const [menuItems, setMenuItems] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [foodForm, setFoodForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    image: '',
    isVeg: true,
    isAvailable: true,
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/menu/my-menu');
      setMenuItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load menu:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFoodForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFoodForm({
      name: '',
      description: '',
      price: '',
      category: 'Main Course',
      image: '',
      isVeg: true,
      isAvailable: true,
    });
  };

  const handleSaveFood = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingItem) {
        await api.put(`/menu/${editingItem._id}`, foodForm);
        alert('Food item updated successfully!');
      } else {
        await api.post('/menu', foodForm);
        alert('Food item uploaded & saved!');
      }
      resetForm();
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
      isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Manage Menu Items</h2>
        <Link
          to="/owner-dashboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <form onSubmit={handleSaveFood} className="bg-white p-6 rounded-xl shadow-xs mb-8 border">
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
            placeholder="Category (Starter, Main Course, Dessert)"
            className="p-2.5 border rounded-lg"
            value={foodForm.category}
            onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })}
          />

          {/* Veg / Non-Veg Selection */}
          <div className="flex items-center gap-4 p-2.5 border rounded-lg bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Food Type:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="isVeg"
                checked={foodForm.isVeg === true}
                onChange={() => setFoodForm({ ...foodForm, isVeg: true })}
              />
              <span className="text-sm font-bold text-green-700 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Veg
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="isVeg"
                checked={foodForm.isVeg === false}
                onChange={() => setFoodForm({ ...foodForm, isVeg: false })}
              />
              <span className="text-sm font-bold text-red-600 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Non-Veg
              </span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Food Image (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full p-2 border rounded-lg bg-white text-sm"
            />
          </div>
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
            {uploading ? 'Saving...' : editingItem ? 'Update Food Item' : 'Add Food Item'}
          </button>
          {editingItem && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 rounded-lg cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <h3 className="text-xl font-bold text-gray-800 mb-4">Your Menu ({menuItems.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div
            key={item._id}
            className="border rounded-xl p-4 shadow-xs bg-white flex flex-col justify-between"
          >
            <div>
              <div className="relative">
                <img
                  src={
                    item.image ||
                    item.imageUrl ||
                    'https://placehold.co/300x180?text=No+Image'
                  }
                  alt={item.name}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
                <span
                  className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs ${
                    item.isVeg === false
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-green-100 text-green-800 border border-green-300'
                  }`}
                >
                  {item.isVeg === false ? '● Non-Veg' : '● Veg'}
                </span>
              </div>
              <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="mt-2 font-semibold text-orange-600">
                ₹{item.price} • {item.category}
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => startEditFood(item)}
                className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteFood(item._id)}
                className="py-1.5 px-3 bg-red-100 text-red-600 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}