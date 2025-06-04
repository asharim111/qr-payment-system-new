const crypto = require("crypto");
const axios = require("axios");
const { notifyTransaction } = require("../utils/websocket-server");

function verifyHMAC(req, paymentUrl, transaction) {
  // const receivedSig = req.headers["x-vc-signature"];
  const receivedSig = req.query.hmac ?? null;
  if (!receivedSig || receivedSig.length === 0 || receivedSig === "undefined") {
    notifyTransaction(transaction.transactionId, {
      status:
        "Invald QR code (possible tampering or HMAC validation failed (possible MITM or cloning)",
      timestamp: Date.now(),
    });
    return { error: "Missing request signature" };
  }
  if (!req.query) {
    return { error: "Missing payment details" };
  }

  const hmacPayload = JSON.stringify({
    transactionId: String(transaction.transactionId),
    userId: String(transaction.userId),
    paymentUrl: String(paymentUrl),
    amount: String(transaction.amount),
  });

  const computedSig = crypto
    .createHmac("sha256", Buffer.from(process.env.VC_SECRET, "hex"))
    .update(hmacPayload)
    .digest("hex");

  const receivedBuf = Buffer.from(receivedSig, "hex");
  const computedBuf = Buffer.from(computedSig, "hex");

  if (
    receivedBuf.length !== computedBuf.length ||
    !crypto.timingSafeEqual(receivedBuf, computedBuf)
  ) {
    notifyTransaction(transaction.transactionId, {
      status:
        "Invald QR code (possible tampering or HMAC validation failed (possible MITM or cloning)",
      timestamp: Date.now(),
    });
    return { error: "Invalid security signature" };
  }

  // if () {
  //   notifyTransaction(transaction.transactionId, {
  //     status:
  //       "Invald QR code (possible tampering or HMAC validation failed (possible MITM or cloning)",
  //     timestamp: Date.now(),
  //   });
  //   return { error: "Invalid security signature" };
  // }
}

function checkContentType(req) {
  // Your content type check logic here, or leave empty if not needed
}

async function checkUrlSafety(url) {
  // const trustedDomain = ["secure-pay.com"];
  const trustedDomain = [process.env.BASE_URL.replace(/(^\w+:|^)\/\//, "")];
  const parsed = new URL(url);
  const blockedExt = ["exe", "bat", "sh", "dmg", "apk", "msi", "jar", "cmd"];
  const ext = parsed.pathname.split(".").pop().toLowerCase();
  if (blockedExt.includes(ext)) return false;
  if (!trustedDomain.includes(parsed.hostname)) return false;

  const res = await axios.post(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_SAFE_BROWSING_KEY}`,
    {
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntries: [{ url }],
      },
    }
  );

  return !res.data.matches;
}

module.exports = {
  securityMiddleware: (req, res, next) => {
    verifyHMAC(req);
    checkContentType(req);
    next();
  },
  verifyHMAC,
  checkContentType,
  checkUrlSafety,
};
