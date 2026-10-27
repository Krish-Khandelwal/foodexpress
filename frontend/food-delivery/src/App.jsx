import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Layout/Navbar';
import CartDrawer from './components/Cart/CartDrawer';

import Home from './pages/Customer/Home';
import Checkout from './pages/Customer/Checkout';
import TrackOrder from './pages/Customer/TrackOrder';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ShopDashboard from './pages/Owner/ShopDashboard';
import MenuManagement from './pages/Owner/MenuManagement';
import DeliveryDashboard from './pages/Delivery/DeliveryDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';

const getRoleHomePath = (user) => {
  if (!user) return '/login';
  const role = (user.role || 'customer').toLowerCase();
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  if (role === 'rider') return '/delivery';
  return '/';
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  const userRole = (user?.role || '').toLowerCase();

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar
        toggleCart={() => setIsCartOpen((prev) => !prev)}
        onOpenOrders={() => setShowOrdersModal(true)}
      />
      {user && userRole === 'customer' && (
        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
        />
      )}
      <Routes>
        <Route
          path="/"
          element={
            !user ? (
              <Navigate to="/login" replace />
            ) : userRole !== 'customer' ? (
              <Navigate to={getRoleHomePath(user)} replace />
            ) : (
              <Home
                showOrdersModal={showOrdersModal}
                setShowOrdersModal={setShowOrdersModal}
              />
            )
          }
        />
        <Route
          path="/login"
          element={user ? <Navigate to={getRoleHomePath(user)} replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to={getRoleHomePath(user)} replace /> : <Register />}
        />
        <Route
          path="/checkout"
          element={user ? <Checkout /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/track-order/:id"
          element={user ? <TrackOrder /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/owner"
          element={user ? <ShopDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/owner/menu"
          element={user ? <MenuManagement /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/delivery"
          element={user ? <DeliveryDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user ? <AdminDashboard /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <AppRoutes />
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;