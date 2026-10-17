import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ManageMenu() {
  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

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
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/menu/my-menu`, authHeaders);
      setMenuItems(data);
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

  const handleSaveFood = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      if (editingItem) {
        await axios.put(`${API_BASE}/menu/${editingItem._id}`, foodForm, authHeaders);
        alert('Food item updated successfully!');
      } else {
        await axios.post(`${API_BASE}/menu`, foodForm, authHeaders);
        alert('Food item uploaded & saved!');
      }
      setEditingItem(null);
      setFoodForm({ name: '', description: '', price: '', category: 'Main Course', image: '', isAvailable: true });
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
      await axios.delete(`${API_BASE}/menu/${id}`, authHeaders);
      fetchMenu();
    } catch (err) {
      alert('Failed to delete item');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Manage Menu Items</h2>

      <form onSubmit={handleSaveFood} className="bg-white p-6 rounded-lg shadow mb-8 border">
        <h3 className="text-lg font-semibold mb-4">
          {editingItem ? `Edit Food Item: ${editingItem.name}` : 'Add New Food Item'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Food Name *" required className="p-2 border rounded"
            value={foodForm.name} onChange={(e) => setFoodForm({ ...foodForm, name: e.target.value })} />
            
          <input type="number" placeholder="Price (₹) *" required className="p-2 border rounded"
            value={foodForm.price} onChange={(e) => setFoodForm({ ...foodForm, price: e.target.value })} />
            
          <input type="text" placeholder="Category (Starter, Main Course, Dessert)" className="p-2 border rounded"
            value={foodForm.category} onChange={(e) => setFoodForm({ ...foodForm, category: e.target.value })} />
            
          <input type="file" accept="image/*" onChange={handleFileChange} className="p-2 border rounded bg-white" />
        </div>

        <textarea placeholder="Food Description" className="w-full p-2 border rounded mt-4" rows={2}
          value={foodForm.description} onChange={(e) => setFoodForm({ ...foodForm, description: e.target.value })} />

        {foodForm.image && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Image Preview:</p>
            <img src={foodForm.image} alt="Preview" className="w-24 h-24 object-cover rounded border" />
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button type="submit" disabled={uploading} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50">
            {uploading ? 'Uploading to Cloudinary...' : editingItem ? 'Update Food Item' : 'Add Food Item'}
          </button>
          {editingItem && (
            <button type="button" onClick={() => {
              setEditingItem(null);
              setFoodForm({ name: '', description: '', price: '', category: 'Main Course', image: '', isAvailable: true });
            }} className="px-4 py-2 bg-gray-200 rounded">Cancel Edit</button>
          )}
        </div>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div key={item._id} className="border rounded-lg p-4 shadow-sm bg-white flex flex-col justify-between">
            <div>
              <img src={item.image || item.imageUrl || 'https://via.placeholder.com/300x180?text=No+Image'} 
                alt={item.name} className="w-full h-40 object-cover rounded mb-3" />
              <h4 className="font-bold text-lg">{item.name}</h4>
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="mt-2 font-semibold text-orange-600">₹{item.price} • {item.category}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => startEditFood(item)} className="flex-1 py-1.5 bg-blue-600 text-white rounded text-sm">Edit</button>
              <button onClick={() => handleDeleteFood(item._id)} className="py-1.5 px-3 bg-red-100 text-red-600 rounded text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}