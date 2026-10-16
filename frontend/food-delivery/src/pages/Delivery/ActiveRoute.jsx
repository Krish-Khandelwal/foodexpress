import React from 'react';
import { Navigate } from 'react-router-dom';

const ActiveRoute = () => {
  // Active route logic is handled inside DeliveryDashboard in this architecture
  return <Navigate to="/delivery" replace />;
};
export default ActiveRoute;