import React from "react";
import { Container, Row, Col, Card, Button } from "react-bootstrap";

const Profile = () => {
  return (
    <Container className="mt-5">
      <Row className="justify-content-md-center">
        <Col md="8">
          <Card className="shadow-sm p-4">
            <h2 className="text-center mb-4">Profile</h2>
            <p>
              <strong>Name:</strong> John Doe
            </p>
            <p>
              <strong>Email:</strong> john.doe@example.com
            </p>
            <p>
              <strong>Phone:</strong> +1234567890
            </p>
            <div className="text-center">
              <Button variant="primary">Edit Profile</Button>
            </div>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;
