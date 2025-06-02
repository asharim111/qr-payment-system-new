const WebSocket = require("ws");
const redis = require("redis");
const { verifyHMAC } = require("./security");

const wss = new WebSocket.Server({ port: 8080 });
const redisClient = redis.createClient();
const redisPublisher = redisClient.duplicate();

// Track active WebSocket connections by transaction ID
const activeConnections = new Map();

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.split("?")[1]);
  const transactionId = params.get("tx");
  const hmac = params.get("hmac");

  // Authenticate connection using HMAC
  if (!verifyHMAC(transactionId, hmac)) {
    ws.close(1008, "Unauthorized");
    return;
  }

  // Store WebSocket connection
  activeConnections.set(transactionId, ws);
  console.log(`Device A connected for TX: ${transactionId}`);

  // Listen for Redis messages
  redisClient.subscribe(`tx:${transactionId}`, (err) => {
    if (err) console.error("Redis sub error:", err);
  });

  // Forward Redis messages to Device A
  redisClient.on("message", (channel, message) => {
    if (channel === `tx:${transactionId}`) {
      ws.send(message);
    }
  });

  // Cleanup on close
  ws.on("close", () => {
    activeConnections.delete(transactionId);
    redisClient.unsubscribe(`tx:${transactionId}`);
  });
});
