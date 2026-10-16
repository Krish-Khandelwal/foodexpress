import React from 'react';
import { Navigate } from 'react-router-dom';

const Checkout = () => {
  // Checkout logic is handled inside CartDrawer in this architecture
  return <Navigate to="/" replace />;
};
export default Checkout;