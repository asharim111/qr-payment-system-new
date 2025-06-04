import { useState, useEffect } from "react";
import { Table, Container, Card } from "react-bootstrap";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate } from "react-router-dom";

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const token = localStorage.getItem("token") || Cookies.get("token");
  const navigate = useNavigate();

  if (!token) {
    navigate("/login");
  }

  function formatDate(dateString) {
    const isoString = "2025-06-04T10:42:35.779Z";
    const date = new Date(isoString);
    const formatted = date.toLocaleString(); // e.g., "6/4/2025, 4:12:35 PM"
    return formatted;
  }

  useEffect(() => {
    const fetchTransactions = async () => {
      const response = await axios.get(
        "http://localhost:3000/api/payments/transactions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setTransactions(response.data);
    };
    fetchTransactions();
  }, [token]);

  return (
    <Container className="mt-5">
      <Card className="shadow-sm p-4">
        <h2 className="text-center mb-4">Transaction History</h2>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.transactionId}>
                  <td>{tx.transactionId}</td>
                  <td>{formatDate(tx.date)}</td>
                  <td>{tx.amount}</td>
                  <td>{tx.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
};

export default TransactionHistory;
