const WebSocket = require("ws");
const redis = require("redis");
const url = require("url");

// Create Redis subscriber client
const subscriber = redis.createClient({ url: "redis://localhost:6379" });

subscriber.on("connect", () => console.log("[Redis] Subscriber connected"));
subscriber.on("ready", () => console.log("[Redis] Subscriber ready"));
subscriber.on("error", (err) => console.error("[Redis] Error:", err));
subscriber.on("end", () => console.log("[Redis] Subscriber connection closed"));

// Start WebSocket server on port 8080
const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("[WebSocket] Server running on ws://localhost:8080");
});

const connections = new Map(); // Map: transactionId -> ws

wss.on("connection", (ws, req) => {
  const params = url.parse(req.url, true).query;
  const transactionId = params.tx;
  const hmac = params.hmac;

  console.log(`[WebSocket] New connection: tx=${transactionId}, hmac=${hmac}`);

  // (Optional) Authenticate HMAC here

  if (transactionId) {
    connections.set(transactionId, ws);
    console.log(
      `[WebSocket] Registered connection for transaction ${transactionId}`
    );

    // Subscribe to this transaction's Redis channel
    subscriber
      .subscribe(`tx:${transactionId}`)
      .then(() => {
        console.log(`[Redis] Subscribed to channel tx:${transactionId}`);
      })
      .catch((err) => {
        console.error(
          `[Redis] Subscription error for tx:${transactionId}:`,
          err
        );
      });

    // Listen for Redis messages and forward to client
    const messageHandler = (channel, message) => {
      if (
        channel === `tx:${transactionId}` &&
        ws.readyState === WebSocket.OPEN
      ) {
        console.log(
          `[WebSocket] Forwarding message to client for tx=${transactionId}: ${message}`
        );
        ws.send(message);
      }
    };

    subscriber.on("message", messageHandler);

    // Clean up on disconnect
    ws.on("close", () => {
      connections.delete(transactionId);
      subscriber.unsubscribe(`tx:${transactionId}`).then(() => {
        console.log(`[Redis] Unsubscribed from channel tx:${transactionId}`);
      });
      subscriber.removeListener("message", messageHandler);
      console.log(
        `[WebSocket] Connection closed for transaction ${transactionId}`
      );
    });

    ws.on("error", (err) => {
      console.error(`[WebSocket] Error for tx=${transactionId}:`, err);
    });
  } else {
    console.log("[WebSocket] Connection missing transactionId, closing");
    ws.close();
  }
});
