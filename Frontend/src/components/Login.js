import React, { useState } from "react";
import {
  Form,
  Button,
  Container,
  Row,
  Col,
  Card,
  Modal,
} from "react-bootstrap";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

const Login = ({ setIsLoggedIn }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [, setError] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const navigate = useNavigate();
  const [userId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:3000/api/users/login",
        {
          username,
          password,
        },
        {
          withCredentials: true,
        }
      );
      const loginData = response.data;
      console.log(loginData);

      if (loginData.qrCode) {
        // setShowModal(true);
        // setIsLoggedIn(true);
        setQrCode(loginData.qrCode);
        // setUserId(loginData.userId);
        Cookies.set("loginData", loginData);
        navigate("/generate-qr");
      }
      // else {
      // }
    } catch (error) {
      console.error("Error:", error);
      setError("Invalid Credentials");
      alert(error.response.data.message ?? "Something went wrong");
    }
  };

  const navigateToOtherPage = () => {
    navigate("/generate-qr");
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:8000/api/users/verifyMfa",
        {
          token: mfaToken,
          userId,
        }
      );
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("MFA verification error:", error);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="6">
          <Card className="shadow-sm p-4">
            <h2 className="text-center mb-4">Login</h2>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formUsername">
                <Form.Label>Username</Form.Label>
                <Form.Control
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </Form.Group>
              <Button variant="primary" type="submit">
                Login
              </Button>
            </Form>
            <p>
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </Card>

          <Modal centered show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
              <Modal.Title>Scan to Login</Modal.Title>
            </Modal.Header>
            <Modal.Body className="text-center">
              <img src={qrCode} alt="QR Code" />
              <p>
                Scan the QR code with Google authenticator app and enter the
                code to login.
              </p>
              <form onSubmit={handleMfaVerify}>
                <input
                  type="text"
                  placeholder="Enter code"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                />
                <button type="submit">Verify code</button>
              </form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => navigateToOtherPage()}>
                Close
              </Button>
            </Modal.Footer>
          </Modal>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;
