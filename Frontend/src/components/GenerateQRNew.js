import React, { useState } from "react";
import {
  Container,
  Button,
  Form,
  Row,
  Col,
  Card,
  Table,
  Image,
} from "react-bootstrap";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GenerateQRNew = () => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [qrCodes, setQrCodes] = useState({ aes: "", rsa: "", vc: "" });
  const [timeTaken, setTimeTaken] = useState({
    aes: { enc: 0, dec: 0 },
    rsa: { enc: 0, dec: 0 },
    vc: { enc: 0, dec: 0 },
  });

  const generateQR = async () => {
    try {
      if (amount <= 0) {
        setError(true);
        setQrCodes({});
        setErrorMessage("Amount must be greater than 0");
        return;
      }

      const response = await axios.post(
        "http://localhost:8000/api/users/generate_qr",
        {
          amount,
        }
      );
      console.log(response.data);
      setError(false);
      setErrorMessage("");

      setQrCodes({
        aes: response.data.aes.qrBase64,
        rsa: response.data.rsa.qrBase64,
        vc: response.data.vc.qrBase64,
      });

      setTimeTaken({
        aes: {
          enc: response.data.aes.time,
          dec: response.data.aes.decryptionTime,
        },
        rsa: {
          enc: response.data.rsa.time,
          dec: response.data.rsa.decryptionTime,
        },
        vc: {
          enc: response.data.vc.time,
          dec: response.data.vc.decryptionTime,
        },
      });
    } catch (error) {
      setError(true);
      setQrCodes({});
      setErrorMessage(error.message);
      // console.error("Error generating QR codes", error);
    }
  };

  return (
    <Container>
      <Row className="justify-content-md-center">
        <Col md={6}>
          <Card className="p-4 mt-4 shadow-lg">
            <h2 className="text-center">Secure QR Generator</h2>
            <Form>
              <Form.Group>
                <Form.Label>Enter Amount</Form.Label>
                <Form.Control
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter payment details..."
                />
              </Form.Group>
              <Button
                variant="primary"
                className="mt-3 w-100"
                onClick={generateQR}
              >
                Generate QR
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>
      <Row className="mt-4 justify-content-md-center">
        <Col md={6}>
          {error && <h4 className="text-danger text-center">{errorMessage}</h4>}
          {/* <Bar data={chartData} /> */}
          {qrCodes.aes && (
            <Row className="mt-4">
              <h4 className="text-center">Performance Comparison</h4>
              <Col md={12}>
                <Table
                  striped
                  bordered
                  hover
                  className="mt-3 text-center justify-center"
                >
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Encryption Time (ms)</th>
                      <th>Decryption Time (ms)</th>
                      <th>QR Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>AES</td>
                      <td>{timeTaken.aes.enc} ms</td>
                      <td>{timeTaken.aes.dec} ms</td>
                      <td>
                        <Image
                          // src={`data:image/png;base64,${qrCodes.aes}`}
                          src={`${qrCodes.aes}`}
                          alt="AES QR"
                          width={100}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>RSA</td>
                      <td>{timeTaken.rsa.enc} ms</td>
                      <td>{timeTaken.rsa.dec} ms</td>
                      <td>
                        <Image
                          src={`${qrCodes.rsa}`}
                          alt="RSA QR"
                          width={100}
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Visual Cryptography</td>
                      <td>{timeTaken.vc.enc} ms</td>
                      <td>{timeTaken.vc.dec} ms</td>
                      <td>
                        <Image
                          src={`data:image/png;base64,${qrCodes.vc}`}
                          alt="VC QR"
                          width={100}
                        />
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default GenerateQRNew;
