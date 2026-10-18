import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import CartDrawer from './components/Cart/CartDrawer';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Home from './pages/Customer/Home';
import Checkout from './pages/Customer/Checkout';
import TrackOrder from './pages/Customer/TrackOrder';
import ShopDashboard from './pages/Owner/ShopDashboard';
import MenuManagement from './pages/Owner/MenuManagement';
import DeliveryDashboard from './pages/Delivery/DeliveryDashboard';
import ActiveRoute from './pages/Delivery/ActiveRoute';
import AdminDashboard from './pages/Admin/AdminDashboard';
import VendorApprovals from './pages/Admin/VendorApprovals';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="p-10 text-center font-bold animate-pulse text-orange-600">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const userRole = user?.role?.toLowerCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    if (userRole === 'owner') return <Navigate to="/owner-dashboard" replace />;
    if (userRole === 'rider') return <Navigate to="/delivery-dashboard" replace />;
    if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar toggleCart={() => setIsCartOpen((prev) => !prev)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Customer Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Home toggleCart={() => setIsCartOpen(true)} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/track-order/:id"
              element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <TrackOrder />
                </ProtectedRoute>
              }
            />

            {/* Owner Routes */}
            <Route
              path="/owner-dashboard"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <ShopDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-menu"
              element={
                <ProtectedRoute allowedRoles={['owner']}>
                  <MenuManagement />
                </ProtectedRoute>
              }
            />

            {/* Delivery Routes */}
            <Route
              path="/delivery-dashboard"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <DeliveryDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/active-route"
              element={
                <ProtectedRoute allowedRoles={['rider']}>
                  <ActiveRoute />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <VendorApprovals />
                </ProtectedRoute>
              }
            />

            {/* Fallback Catch-All Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;