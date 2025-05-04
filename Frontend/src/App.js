import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
// import Cookies from "js-cookie"
import { Container } from "react-bootstrap";
import Login from "./components/Login";
import Register from "./components/Register";
import CompareQR from "./components/CompareQR";
import GenerateQR from "./components/GenerateQR";
// import ScanQR from "./components/ScanQR";
import NavBar from "./components/NavBar";
import PrivateRoute from "./components/middleware/PrivateRoute";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import TransactionHistory from "./components/TransactionHistory";
// import axios from "axios";

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loginData = localStorage.getItem("token");
    if (loginData) {
      setIsLoggedIn(true);
    }
  }, []);
  return (
    <Router>
      <NavBar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
      <Container>
        <Routes>
          <Route
            path="/login"
            element={<Login setIsLoggedIn={setIsLoggedIn} />}
          />
          <Route path="/" element={<Login setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/compare-qr"
            element={
              <PrivateRoute>
                <CompareQR />
              </PrivateRoute>
            }
          />
          <Route
            path="/generate-qr"
            element={
              <PrivateRoute>
                <GenerateQR />
              </PrivateRoute>
            }
          />
          {/* <Route
            path="/scan-qr"
            element={
              <PrivateRoute>
                <ScanQR />
              </PrivateRoute>
            }
          /> */}
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/transaction-history"
            element={
              <PrivateRoute>
                <TransactionHistory />
              </PrivateRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <PrivateRoute>
                <Settings />
              </PrivateRoute>
            }
          />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;
