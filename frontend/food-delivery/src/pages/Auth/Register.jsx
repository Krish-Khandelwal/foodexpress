import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopCuisine: '',
    shopDescription: '',
    shopImage: '',
  });

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, shopImage: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/auth/register`, formData);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));
      
      if (data.role === 'owner') navigate('/owner-dashboard');
      else if (data.role === 'rider') navigate('/delivery-dashboard');
      else navigate('/');
      
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-orange-600">Join FoodExpress</h2>
        
        {error && <div className="bg-red-100 text-red-600 p-2 mb-4 rounded text-sm">{error}</div>}

        <div className="space-y-4">
          <input type="text" placeholder="Full Name" required className="w-full p-2 border rounded"
            value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            
          <input type="email" placeholder="Email Address" required className="w-full p-2 border rounded"
            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            
          <input type="password" placeholder="Password" required className="w-full p-2 border rounded"
            value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            
          <input type="text" placeholder="Phone Number" required className="w-full p-2 border rounded"
            value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
            <select 
              className="w-full p-2 border rounded bg-white"
              value={formData.role} 
              onChange={(e) => setFormData({...formData, role: e.target.value})}
            >
              <option value="customer">Customer</option>
              <option value="owner">Restaurant Owner</option>
              <option value="rider">Delivery Rider</option>
            </select>
          </div>

          {/* Restaurant Owner Extra Fields */}
          {formData.role === 'owner' && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
              <h4 className="font-semibold text-gray-700">Restaurant Details (Editable later)</h4>
              <input type="text" placeholder="Restaurant Name *" required className="w-full p-2 border rounded"
                value={formData.shopName} onChange={(e) => setFormData({ ...formData, shopName: e.target.value })} />
              
              <input type="text" placeholder="Restaurant Address *" required className="w-full p-2 border rounded"
                value={formData.shopAddress} onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })} />
              
              <input type="text" placeholder="Cuisine (e.g. North Indian, Chinese)" className="w-full p-2 border rounded"
                value={formData.shopCuisine} onChange={(e) => setFormData({ ...formData, shopCuisine: e.target.value })} />
              
              <div>
                <label className="block text-sm text-gray-600 mb-1">Restaurant Banner Image</label>
                <input type="file" accept="image/*" onChange={handleImageFile} className="w-full text-sm" />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-orange-600 text-white font-bold py-2 rounded hover:bg-orange-700">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>
        
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account? <Link className="text-orange-600 font-bold" to="/login">Login here</Link>
        </p>
      </form>
    </div>
  );
}