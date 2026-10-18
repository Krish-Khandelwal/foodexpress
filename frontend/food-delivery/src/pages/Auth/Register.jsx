import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
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
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/register', formData);
      login(data);

      const role = data.role?.toLowerCase();
      if (role === 'owner') navigate('/owner-dashboard');
      else if (role === 'rider') navigate('/delivery-dashboard');
      else if (role === 'admin') navigate('/admin-dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)] bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-md w-full max-w-md border border-gray-100"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-orange-600">Join FoodExpress</h2>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 mb-4 rounded-md text-sm border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            required
            className="w-full p-2.5 border border-gray-300 rounded-lg"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <input
            type="email"
            placeholder="Email Address"
            required
            className="w-full p-2.5 border border-gray-300 rounded-lg"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <input
            type="password"
            placeholder="Password"
            required
            className="w-full p-2.5 border border-gray-300 rounded-lg"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          <input
            type="text"
            placeholder="Phone Number"
            required
            className="w-full p-2.5 border border-gray-300 rounded-lg"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a:</label>
            <select
              className="w-full p-2.5 border border-gray-300 rounded-lg bg-white"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="customer">Customer</option>
              <option value="owner">Restaurant Owner</option>
              <option value="rider">Delivery Rider</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {formData.role === 'owner' && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50 space-y-3">
              <h4 className="font-semibold text-gray-700">Restaurant Details (Editable later)</h4>
              <input
                type="text"
                placeholder="Restaurant Name *"
                required
                className="w-full p-2 border rounded bg-white"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />

              <input
                type="text"
                placeholder="Restaurant Address *"
                required
                className="w-full p-2 border rounded bg-white"
                value={formData.shopAddress}
                onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
              />

              <input
                type="text"
                placeholder="Cuisine (e.g. North Indian, Chinese)"
                className="w-full p-2 border rounded bg-white"
                value={formData.shopCuisine}
                onChange={(e) => setFormData({ ...formData, shopCuisine: e.target.value })}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link className="text-orange-600 font-bold hover:underline" to="/login">
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
}