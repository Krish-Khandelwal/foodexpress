import React from 'react';
import { Navigate } from 'react-router-dom';

const ActiveRoute = () => {
  return <Navigate to="/delivery-dashboard" replace />;
};

export default ActiveRoute;