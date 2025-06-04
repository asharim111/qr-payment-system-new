// wsServer.js
const WebSocket = require("ws");
const url = require("url");

const wss = new WebSocket.Server({ port: 8080 }, () => {
  console.log("[WebSocket] Server running on ws://localhost:8080");
});

const connections = new Map(); // transactionId -> ws

wss.on("connection", (ws, req) => {
  const params = url.parse(req.url, true).query;
  const transactionId = params.tx;
  const hmac = params.hmac;

  console.log(`[WebSocket] New connection: tx=${transactionId}, hmac=${hmac}`);

  if (transactionId) {
    connections.set(transactionId, ws);
    console.log(
      `[WebSocket] Registered connection for transaction ${transactionId}`
    );
  }

  ws.on("close", () => {
    connections.delete(transactionId);
    console.log(
      `[WebSocket] Connection closed for transaction ${transactionId}`
    );
  });

  ws.on("error", (err) => {
    console.error(`[WebSocket] Error for tx=${transactionId}:`, err);
  });
});

// Export a function to notify clients
function notifyTransaction(transactionId, message) {
  const ws = connections.get(transactionId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log(`[WebSocket] Sent message to tx=${transactionId}:`, message);
  } else {
    console.log(`[WebSocket] No active connection for tx=${transactionId}`);
  }
}

module.exports = { notifyTransaction };
