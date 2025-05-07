import React, { useState, useRef } from "react";
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

const GenerateQR = () => {
  const [amount, setAmount] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const pollingRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowQR(false);
    setQrCode(null);
    setTransactionId(null);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    try {
      const response = await axios.post(
        "http://localhost:3000/api/payments/initiate",
        { amount }
      );
      setQrCode(response.data.qrCode || response.data.qrBase64);
      setTransactionId(response.data.transactionId);
      setShowQR(true);

      // Start polling for verification
      // pollingRef.current = setInterval(async () => {
      //   try {
      //     const verification = await axios.post(
      //       "http://localhost:3000/api/payments/verify",
      //       {
      //         clientShare: qrCode,
      //         transactionId: response.data.transactionId,
      //       }
      //     );
      //     if (verification.data.status === "success") {
      //       clearInterval(pollingRef.current);
      //       alert("Payment successful!");
      //       // window.location.reload();
      //     }
      //   } catch (err) {
      //     // Optionally handle polling errors
      //   }
      // }, 20000);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

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
    </Container>
  );
};

export default GenerateQR;
