import React from 'react';
import { Navigate } from 'react-router-dom';
import Cookies from "js-cookie"

function PrivateRoute({ children }) {
  const loginData = Cookies.get("loginData");

  return loginData ? children : <Navigate to="/login" />;
}

export default PrivateRoute;