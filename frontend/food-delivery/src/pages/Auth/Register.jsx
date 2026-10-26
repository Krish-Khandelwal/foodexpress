import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import API from '../../api/axios';

const ensureGoogleScriptLoaded = () => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google);
      return;
    }
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
    shopName: '',
    shopAddress: '',
    shopCuisine: 'Multi-Cuisine',
  });
  const [showPassword, setShowPassword] = useState(false); // Added toggle state
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleClientId, setGoogleClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    ensureGoogleScriptLoaded().catch(() => {});

    if (!googleClientId || googleClientId === 'your_google_client_id') {
      API.get('/auth/google-config')
        .then(({ data }) => {
          if (data?.clientId) {
            setGoogleClientId(data.clientId);
          }
        })
        .catch(() => {});
    }
  }, [googleClientId]);

  const redirectByRole = (role) => {
    const normalizedRole = (role || 'customer').toLowerCase();
    if (normalizedRole === 'admin') {
      navigate('/admin');
    } else if (normalizedRole === 'owner') {
      navigate('/owner');
    } else if (normalizedRole === 'rider' || normalizedRole === 'delivery_boy') {
      navigate('/delivery');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await API.post('/auth/register', formData);
      login(data);
      redirectByRole(data.role);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');

    let activeClientId = googleClientId;
    if (!activeClientId || activeClientId === 'your_google_client_id') {
      try {
        const { data } = await API.get('/auth/google-config');
        activeClientId = data?.clientId || '';
        setGoogleClientId(activeClientId);
      } catch {
        // ignore
      }
    }

    if (!activeClientId || activeClientId === 'your_google_client_id') {
      setError(
        'Missing GOOGLE_CLIENT_ID! Please add GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com in backend/.env'
      );
      return;
    }

    try {
      setGoogleLoading(true);
      await ensureGoogleScriptLoaded();

      if (!window.google?.accounts?.oauth2) {
        setError('Google Sign-In library failed to load. Check your internet connection.');
        setGoogleLoading(false);
        return;
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: activeClientId,
        scope: 'openid email profile',
        prompt: 'select_account',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            setError(`Google error: ${tokenResponse.error_description || tokenResponse.error}`);
            setGoogleLoading(false);
            return;
          }

          if (tokenResponse?.access_token) {
            try {
              const { data } = await API.post('/auth/google', {
                access_token: tokenResponse.access_token,
              });
              login(data);
              redirectByRole(data.role);
            } catch (err) {
              setError(err.response?.data?.message || 'Google sign-in failed on server');
            } finally {
              setGoogleLoading(false);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: () => {
          setGoogleLoading(false);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setError('Could not initialize Google Sign-In.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md border border-gray-100">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-extrabold text-gray-900">Create Account</h2>
          <p className="text-sm text-gray-500 mt-1">
            Join FoodExpress as a Customer, Restaurant Owner, or Rider
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              required
              value={formData.name}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              required
              value={formData.email}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter 10-digit phone number"
              value={formData.phone}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                required
                value={formData.password}
                className="w-full border border-gray-300 rounded-lg p-2.5 pr-10 text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  // Eye slash icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Role
            </label>
            <select
              value={formData.role}
              className="w-full border border-gray-300 rounded-lg p-2.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="customer">Customer</option>
              <option value="owner">Restaurant Owner</option>
              <option value="rider">Delivery Partner (Rider)</option>
            </select>
          </div>

          {formData.role === 'owner' && (
            <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-xl space-y-3">
              <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">
                Restaurant Details
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Restaurant Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spice Villa"
                  required
                  value={formData.shopName}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-800"
                  onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Restaurant Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Connaught Place, New Delhi"
                  required
                  value={formData.shopAddress}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white text-gray-800"
                  onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition cursor-pointer shadow-sm disabled:opacity-60"
          >
            {submitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-gray-400 font-semibold tracking-wider">
              OR
            </span>
          </div>
        </div>

        {/* Continue with Google Button */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-50 transition cursor-pointer shadow-xs disabled:opacity-60"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span>
            {googleLoading ? 'Opening Google Accounts...' : 'Continue with Google'}
          </span>
        </button>

        <p className="text-center mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-600 font-semibold hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;