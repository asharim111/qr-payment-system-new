import React, { useState } from "react";
import { Form, Button, Container, Row, Col, Card } from "react-bootstrap";
import axios from "axios";

const ScanQR = ({ token }) => {
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://localhost:8000/api/users/scan_qr",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log(response.data);
      
      alert(`Scanned Data: ${response.data.scannedData}`);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="6">
          <Card className="shadow-sm p-4">
            <h2 className="text-center mb-4">Scan QR Code</h2>
            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="formFile">
                <Form.Label>Upload QR Code</Form.Label>
                <Form.Control
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
              </Form.Group>
              <Button variant="primary" type="submit" className="mt-3">
                Scan QR Code
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ScanQR;
