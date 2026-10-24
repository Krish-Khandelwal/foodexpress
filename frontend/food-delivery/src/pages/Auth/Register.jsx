import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, Store, MapPin } from 'lucide-react';
import API from '../../api/axios';
import { AuthContext } from '../../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    shopName: '',
    shopAddress: '',
    shopCuisine: 'North Indian, Chinese, Fast Food',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      login(data);

      const role = (data.role || 'customer').toLowerCase();
      if (role === 'admin') navigate('/admin');
      else if (role === 'owner') navigate('/owner');
      else if (role === 'rider') navigate('/delivery');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-linear-to-br from-orange-50 via-white to-amber-50">
      <div className="max-w-lg w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-extrabold text-gray-900">Create Account</h2>
          <p className="text-sm text-gray-500 mt-1">Join FoodExpress today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Your full name"
                  required
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  placeholder="9876543210"
                  required
                  className="w-full border border-gray-300 rounded-xl pl-10 pr-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                placeholder="you@example.com"
                required
                className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                required
                className="w-full border border-gray-300 rounded-xl pl-10 pr-11 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Select Role
            </label>
            <select
              className="w-full border border-gray-300 rounded-xl p-2.5 bg-white text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="customer">Customer (Order Food)</option>
              <option value="owner">Restaurant Owner (Sell Food)</option>
              <option value="rider">Delivery Rider (Deliver Orders)</option>
            </select>
          </div>

          {formData.role === 'owner' && (
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">
                Restaurant Registration Details (Requires Admin Approval)
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Restaurant Name
                </label>
                <div className="relative">
                  <Store
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Spice Villa"
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Restaurant Address
                </label>
                <div className="relative">
                  <MapPin
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="e.g., Connaught Place, New Delhi"
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
                    value={formData.shopAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, shopAddress: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700 transition cursor-pointer shadow-md disabled:opacity-60"
          >
            {submitting ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;