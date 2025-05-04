import React from "react";
import { Container, Card, Form, Button } from "react-bootstrap";
const Settings = () => {
  return (
    <Container className="mt-5">
      <Card className="shadow-sm p-4">
        <h2 className="text-center mb-4">Settings</h2>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Theme</Form.Label>
            <Form.Control as="select">
              <option>Light</option>
              <option>Dark</option>
            </Form.Control>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Notifications</Form.Label>
            <Form.Check type="checkbox" label="Email Notifications" />
            <Form.Check type="checkbox" label="SMS Notifications" />
          </Form.Group>
          <div className="text-center">
            <Button variant="primary">Save Settings</Button>
          </div>
        </Form>
      </Card>
    </Container>
  );
};

export default Settings;
