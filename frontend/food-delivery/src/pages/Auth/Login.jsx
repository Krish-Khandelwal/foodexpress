import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data);

      const role = data.role?.toLowerCase();
      if (role === 'admin') navigate('/admin-dashboard');
      else if (role === 'owner') navigate('/owner-dashboard');
      else if (role === 'rider') navigate('/delivery-dashboard');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Instant 1-Click Admin Init & Login
  const handleQuickAdminLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.post('/admin/init', {
        name: 'FoodExpress Admin',
        email: 'admin@foodexpress.com',
        password: 'Admin@123',
        phone: '9999999999',
      });
      const { data } = await api.post('/auth/login', {
        email: 'admin@foodexpress.com',
        password: 'Admin@123',
      });
      login(data);
      navigate('/admin-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize Admin login');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login to FoodExpress</h2>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              required
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={18} />
            <span>Instant Admin Login (admin@foodexpress.com)</span>
          </button>
        </div>

        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{' '}
          <Link to="/register" className="text-orange-600 font-semibold hover:underline">
            Register (Customer / Owner / Rider / Admin)
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;