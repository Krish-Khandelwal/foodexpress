import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Image as ImageIcon, Upload, X, Utensils, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import * as menuApi from '../../api/menuApi';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageMode, setImageMode] = useState('file'); // 'file' or 'url'
  const [imageError, setImageError] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const fileInputRef = useRef(null);

  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'VEG',
    description: '',
    imageUrl: ''
  });

  // Fetch owner's shop menu on component mount
  useEffect(() => {
    fetchOwnerMenu();
  }, []);

  const fetchOwnerMenu = async () => {
    try {
      setLoading(true);
      const { data } = await menuApi.getOwnerMenu();
      if (data) {
        setShopInfo(data.shop);
        setMenuItems(data.items || []);
      }
    } catch (err) {
      console.warn("Could not load menu from API, using local fallback:", err);
      // Fallback sample item if offline/demo
      setMenuItems([
        { 
          _id: 'sample_1', 
          name: 'Peri Peri Makhana', 
          price: 150, 
          category: 'VEG',
          description: 'Crunchy roasted foxnuts tossed in zesty peri-peri spices',
          imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60',
          isAvailable: true 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Convert uploaded image file to compressed Base64 Data URL
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setImageError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setNewItem(prev => ({ ...prev, imageUrl: compressedDataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setNewItem(prev => ({ ...prev, imageUrl: '' }));
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;

    setSubmitting(true);
    try {
      // Determine how to send the image:
      // - If imageMode is 'file' and imageUrl is base64, send as imageData (backend uploads to Cloudinary)
      // - If imageMode is 'url', send as imageUrl (backend stores the URL directly)
      const payload = {
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category,
        description: newItem.description,
      };

      if (imageMode === 'file' && newItem.imageUrl && newItem.imageUrl.startsWith('data:image')) {
        payload.imageData = newItem.imageUrl;  // base64 → Cloudinary upload on server
      } else if (newItem.imageUrl) {
        payload.imageUrl = newItem.imageUrl;   // plain URL stored directly
      }

      const { data } = await menuApi.createMenuItem(payload);

      setMenuItems(prev => [data, ...prev]);
      // Reset form
      setNewItem({
        name: '',
        price: '',
        category: 'VEG',
        description: '',
        imageUrl: ''
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error("Error creating menu item:", err);
      // Fallback add locally if server issue
      const localItem = {
        _id: Date.now().toString(),
        name: newItem.name,
        price: Number(newItem.price),
        category: newItem.category,
        description: newItem.description,
        imageUrl: newItem.imageUrl,
        isAvailable: true
      };
      setMenuItems(prev => [localItem, ...prev]);
      setNewItem({
        name: '',
        price: '',
        category: 'VEG',
        description: '',
        imageUrl: ''
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await menuApi.deleteMenuItem(id);
    } catch (err) {
      console.warn("Delete API failed, removing locally:", err);
    }
    setMenuItems(prev => prev.filter(item => item._id !== id));
  };

  const handleToggleAvailability = async (id) => {
    try {
      await menuApi.toggleMenuItemAvailability(id);
    } catch (err) {
      console.warn("Toggle API failed, updating locally:", err);
    }
    setMenuItems(prev => prev.map(item => 
      item._id === id ? { ...item, isAvailable: !item.isAvailable } : item
    ));
  };

  const filteredItems = filterCategory === 'ALL' 
    ? menuItems 
    : menuItems.filter(item => item.category === filterCategory);

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'NON_VEG': return 'bg-red-100 text-red-700 border-red-200';
      case 'BEVERAGE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DESSERT': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header & Shop Name Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Menu Management</h1>
          <p className="text-gray-500 text-sm mt-1">
            {shopInfo ? (
              <>Managing dishes for <span className="font-semibold text-blue-600">{shopInfo.shopName}</span></>
            ) : (
              'Add, update, and manage food photos and pricing for your menu'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white px-4 py-2 rounded-xl border shadow-sm text-sm font-medium text-gray-700">
            Total Dishes: <strong className="text-blue-600">{menuItems.length}</strong>
          </span>
        </div>
      </div>

      {/* Add New Food Item Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-10">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Utensils size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Food Item</h2>
            <p className="text-xs text-gray-500">Provide details, category, and an appetising food photo</p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="space-y-6">
          {/* Top row: Name, Category, Price */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Food Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Butter Chicken, Paneer Tikka, Iced Latte" 
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                value={newItem.name} 
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} 
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Category
              </label>
              <select 
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                value={newItem.category} 
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
              >
                <option value="VEG">🌱 Vegetarian</option>
                <option value="NON_VEG">🍗 Non-Vegetarian</option>
                <option value="BEVERAGE">🥤 Beverage</option>
                <option value="DESSERT">🍰 Dessert</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Price (₹) <span className="text-red-500">*</span>
              </label>
              <input 
                type="number" 
                required 
                min="0"
                step="1"
                placeholder="0" 
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
                value={newItem.price} 
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} 
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Description <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea 
              rows="2"
              placeholder="Brief description of the ingredients, spice level, or special flavour..." 
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none" 
              value={newItem.description} 
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} 
            />
          </div>

          {/* Food Image Section */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="block text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                <ImageIcon size={18} className="text-blue-600" />
                Food Image <span className="text-xs font-normal text-gray-500">(Recommended for better customer sales)</span>
              </label>

              {/* Mode Toggle: File vs URL */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border text-xs font-medium self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`px-3 py-1 rounded-md transition ${imageMode === 'file' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-3 py-1 rounded-md transition ${imageMode === 'url' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  Image URL
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Input field based on mode */}
              <div className="md:col-span-8">
                {imageMode === 'file' ? (
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*" 
                      onChange={handleImageFileChange}
                      className="hidden" 
                      id="food-image-input"
                    />
                    <label 
                      htmlFor="food-image-input" 
                      className="flex items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition group"
                    >
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition">
                        <Upload size={20} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition">
                          Click to select a photo from your computer
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Supports PNG, JPG, JPEG, WEBP</p>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <LinkIcon size={16} />
                    </div>
                    <input 
                      type="url" 
                      placeholder="Paste image URL (e.g. https://images.unsplash.com/...)" 
                      className="w-full border border-gray-300 rounded-xl pl-9 pr-3.5 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm" 
                      value={newItem.imageUrl} 
                      onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })} 
                    />
                  </div>
                )}

                {imageError && (
                  <p className="text-xs text-red-600 mt-1.5">{imageError}</p>
                )}
              </div>

              {/* Live Preview Box */}
              <div className="md:col-span-4 flex justify-center md:justify-end">
                {newItem.imageUrl ? (
                  <div className="relative group">
                    <img 
                      src={newItem.imageUrl} 
                      alt="Food Preview" 
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border-2 border-blue-500 shadow-md"
                      onError={() => setImageError('Failed to load image from URL')}
                    />
                    <button 
                      type="button" 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                    <span className="block text-center text-[10px] text-gray-500 mt-1">Image Preview</span>
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-200/70 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                    <ImageIcon size={28} />
                    <span className="text-[10px] text-gray-500 mt-1">No Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={20} />
              {submitting ? 'Adding Dish...' : 'Add Dish to Menu'}
            </button>
          </div>
        </form>
      </div>

      {/* Menu Items Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900">Current Menu ({filteredItems.length})</h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            {['ALL', 'VEG', 'NON_VEG', 'BEVERAGE', 'DESSERT'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterCategory === cat 
                    ? 'bg-white text-blue-600 shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cat === 'ALL' ? 'All Dishes' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border">
            Loading menu items...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Utensils size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-800">No dishes in this category</h3>
            <p className="text-sm text-gray-500 mt-1">Add your food items with appetizing photos using the form above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item._id} 
                className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition flex items-center justify-between gap-4 ${
                  !item.isAvailable ? 'opacity-60 bg-gray-50' : ''
                }`}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Food Image */}
                  <div className="relative flex-shrink-0">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name} 
                        className="w-20 h-20 sm:w-22 sm:h-22 object-cover rounded-xl border border-gray-200 shadow-xs"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=60';
                        }}
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-22 sm:h-22 bg-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <Utensils size={24} />
                        <span className="text-[10px] mt-1 font-medium">No Image</span>
                      </div>
                    )}
                  </div>

                  {/* Text details */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryColor(item.category)}`}>
                        {item.category?.replace('_', ' ') || 'VEG'}
                      </span>
                      {!item.isAvailable && (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                          Sold Out
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base truncate">{item.name}</h3>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    <p className="text-lg font-black text-blue-600 mt-1">₹{item.price}</p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <button 
                    onClick={() => handleToggleAvailability(item._id)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition ${
                      item.isAvailable 
                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                        : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <button 
                    onClick={() => handleDelete(item._id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;