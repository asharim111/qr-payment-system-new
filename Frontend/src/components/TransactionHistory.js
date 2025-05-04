import React from "react";
import { Table, Container, Card } from "react-bootstrap";

const TransactionHistory = () => {
  const transactions = [
    { id: 1, date: "2024-09-14", amount: "$150", status: "Success" },
    { id: 2, date: "2024-09-13", amount: "$90", status: "Failed" },
  ];

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
            {transactions.map((tx) => (
              <tr key={tx.id}>
                <td>{tx.id}</td>
                <td>{tx.date}</td>
                <td>{tx.amount}</td>
                <td>{tx.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
};

export default TransactionHistory;
