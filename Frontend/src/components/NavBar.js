import React, { useState, useEffect } from "react";
import { Navbar, Nav, Container } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Cookies from "js-cookie";
import axios from "axios";

const NavBar = ({ isLoggedIn, setIsLoggedIn }) => {
  const loginData = Cookies.get("loginData");
  // const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPath, setCurrentPath] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Define menu items
  const menuItems = [
    // { name: "Home", path: "/" },
    { name: "Login", path: "/login" },
    { name: "Register", path: "/register" },
  ];

  const profileOptions = [
    // { name: "Compare QR", path: "/compare-qr" },
    { name: "Generate QR", path: "/generate-qr" },
    // { name: "Scan QR", path: "/scan-qr" },
    { name: "Transaction History", path: "/transaction-history" },
    { name: "Profile", path: "/profile" },
    // { name: "Settings", path: "/settings" },
    // { name: "Logout", path: "/logout" },
  ];

  useEffect(() => {
    // if (loginData) {
    //   setIsLoggedIn(true);
    // }
    setCurrentPath(location.pathname);
  }, [location.pathname, setIsLoggedIn, loginData]);

  const handleLogout = async () => {
    if (loginData) {
      await axios.post("http://localhost:3000/api/users/logout");
      Cookies.remove("loginData");
      Cookies.remove("token");
      setIsLoggedIn(false);
      navigate("/login");
    }
  };
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Secure QR Payment
        </Navbar.Brand>
        {loginData ? (
          <>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                {profileOptions.map((item, index) => (
                  <Nav.Link
                    as={Link}
                    className={currentPath === item.path ? "active" : ""}
                    to={item.path}
                    key={index}
                  >
                    {item.name}
                  </Nav.Link>
                ))}
                <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </>
        ) : (
          <>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                {menuItems.map((item, index) => (
                  <Nav.Link
                    as={Link}
                    className={currentPath === item.path ? "active" : ""}
                    to={item.path}
                    key={index}
                  >
                    {item.name}
                  </Nav.Link>
                ))}
                {/* <Nav.Link as={Link} to="/login">
                  Generate QR
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  Scan QR
                </Nav.Link> */}
              </Nav>
            </Navbar.Collapse>
          </>
        )}
      </Container>
    </Navbar>
  );
};

export default NavBar;
