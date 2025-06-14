import React, { useState, useEffect, useRef } from "react";
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
import Cookies from "js-cookie";

const GenerateQR = () => {
  const [amount, setAmount] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [txStatus, setTxStatus] = useState("");
  const [hmac] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // if (transactionId && hmac) {
    if (transactionId) {
      const wsUrl = `ws://localhost:8080/?tx=${transactionId}&hmac=${hmac}`;
      // console.log("[Frontend] Connecting to", wsUrl);
      const ws = new window.WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[Frontend] WebSocket connection established");
      };

      ws.onmessage = (event) => {
        console.log("[Frontend] Received message:", event.data);
        try {
          const data = JSON.parse(event.data);
          setTxStatus(data.status);
          alert(data.status);
          setQrCode(null);
          setShowQR(false);
          setAmount("");
        } catch {
          setTxStatus(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("[Frontend] WebSocket error:", error);
        setTxStatus("WebSocket error");
      };

      ws.onclose = () => {
        console.log("[Frontend] WebSocket connection closed");
      };

      wsRef.current = ws;
      return () => ws.close();
    }
  }, [transactionId, hmac]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowQR(false);
    setQrCode(null);
    setTransactionId(null);
    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        "http://localhost:3000/api/payments/initiate",
        { amount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setQrCode(response.data.qrCode || response.data.qrBase64);
      setTransactionId(response.data.transactionId);
      setShowQR(true);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleClose = () => setShowQR(false);

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="6">
          <Card className="shadow-sm p-4">
            <h2 className="text-center mb-4">Generate QR Code</h2>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formAmount">
                <Form.Label>Amount</Form.Label>
                <Form.Control
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Form.Group>
              <Button
                variant="primary"
                type="submit"
                className="mt-3 text-center justify-center"
              >
                Generate QR
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal show={showQR && qrCode} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Scan to Pay</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {qrCode && (
            <>
              <img src={qrCode} alt="Payment QR" style={{ maxWidth: "100%" }} />
              <p className="mt-3">Transaction ID: {transactionId}</p>
              <p>Scan the QR code to make the payment.</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      {/* {txStatus && <p>Status: {txStatus}</p>} */}
    </Container>
  );
};

export default GenerateQR;
