import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Layout/Navbar';
import CartDrawer from './components/Cart/CartDrawer';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Home from './pages/Customer/Home';
import TrackOrder from './pages/Customer/TrackOrder';
import MenuManagement from './pages/Owner/MenuManagement';
import DeliveryDashboard from './pages/Delivery/DeliveryDashboard';
import VendorApprovals from './pages/Admin/VendorApprovals';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const App = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar toggleCart={() => setIsCartOpen(!isCartOpen)} />
        <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
        
        <main className="flex-1">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Customer Routes */}
            <Route path="/" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <Home toggleCart={() => setIsCartOpen(true)} />
              </ProtectedRoute>
            } />
            <Route path="/track-order/:orderId" element={
              <ProtectedRoute allowedRoles={['USER']}>
                <TrackOrder />
              </ProtectedRoute>
            } />

            {/* Owner Routes */}
            <Route path="/owner" element={
              <ProtectedRoute allowedRoles={['OWNER']}>
                <MenuManagement />
              </ProtectedRoute>
            } />

            {/* Delivery Routes */}
            <Route path="/delivery" element={
              <ProtectedRoute allowedRoles={['DELIVERY_BOY']}>
                <DeliveryDashboard />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <VendorApprovals />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;