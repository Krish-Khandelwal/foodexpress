import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Pencil,
  X,
  AlertOctagon,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import API from '../../api/axios';

const MenuManagement = () => {
  const [shop, setShop] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    image: '',
    isVeg: true,
    isAvailable: true,
  });

  const loadData = async () => {
    try {
      const [shopRes, menuRes, catRes] = await Promise.all([
        API.get('/auth/my-shop'),
        API.get('/menu/my-menu'),
        API.get('/menu/categories'),
      ]);
      setShop(shopRes.data);
      setMenuItems(menuRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      price: '',
      category: categories[0]?.name || 'Main Course',
      image: '',
      isVeg: true,
      isAvailable: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/menu/${editingId}`, form);
      } else {
        await API.post('/menu', form);
      }
      resetForm();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save menu item');
    }
  };

  const handleStartEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: item.price ?? '',
      category: item.category || 'Main Course',
      image: item.image || item.imageUrl || '',
      isVeg: item.isVeg !== undefined ? Boolean(item.isVeg) : true,
      isAvailable: item.isAvailable !== undefined ? Boolean(item.isAvailable) : true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggle = async (id) => {
    try {
      await API.patch(`/menu/${id}/toggle`);
      loadData();
    } catch {
      alert('Failed to toggle availability');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this dish from your menu?')) return;
    try {
      await API.delete(`/menu/${id}`);
      if (editingId === id) resetForm();
      loadData();
    } catch {
      alert('Failed to delete item');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <Link
        to="/owner"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:underline"
      >
        <ArrowLeft size={16} /> Back to Restaurant Dashboard
      </Link>

      {shop?.status === 'rejected' && (
        <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-5 flex items-center gap-3 text-red-900">
          <AlertOctagon className="text-red-600 shrink-0" size={28} />
          <div>
            <h3 className="font-black">Your Restaurant is Rejected by Admin</h3>
            <p className="text-xs text-red-700">
              Please contact Admin (admin@foodexpress.com) for approval so your menu becomes visible to customers.
            </p>
          </div>
        </div>
      )}

      {shop?.status === 'pending' && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
          <Clock className="text-amber-600 shrink-0" size={24} />
          <p className="text-xs font-bold">
            Your restaurant is currently Pending Admin Approval. You can prepare and edit your menu items below.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 h-fit"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">
              {editingId ? 'Edit Dish Details' : 'Add New Dish'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 font-bold cursor-pointer"
              >
                <X size={14} /> Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Dish Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Price (₹)
            </label>
            <input
              type="number"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm bg-white"
            >
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-xl p-2.5 text-sm"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isVeg}
                onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
              />
              Vegetarian Dish
            </label>

            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.checked })
                }
              />
              In Stock
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {editingId ? (
              <>
                <Pencil size={16} /> Update Dish Details
              </>
            ) : (
              <>
                <Plus size={16} /> Add to Menu
              </>
            )}
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xl font-extrabold text-gray-900">
            Your Menu Items ({menuItems.length})
          </h2>
          {menuItems.map((item) => (
            <div
              key={item._id}
              className={`bg-white p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 ${
                editingId === item._id
                  ? 'border-orange-500 ring-2 ring-orange-100'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {(item.image || item.imageUrl) && (
                  <img
                    src={item.image || item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-xl object-cover border"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        item.isVeg === false ? 'bg-red-500' : 'bg-emerald-600'
                      }`}
                    />
                    <h4 className="font-bold text-gray-900">{item.name}</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.category} • ₹{item.price}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStartEdit(item)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => handleToggle(item._id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    item.isAvailable
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {item.isAvailable ? 'Available' : 'Sold Out'}
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;