const crypto = require("crypto");
const axios = require("axios");

function verifyHMAC(req, paymentUrl, transaction) {
  const receivedSig = req.headers["x-vc-signature"];
  if (!receivedSig || receivedSig.length === 0 || receivedSig === "undefined") {
    return { error: "Missing request signature" };
  }
  if (!req.body) {
    return { error: "Missing request body" };
  }

  const hmacPayload = JSON.stringify({
    paymentUrl: String(paymentUrl),
    transactionId: String(transaction.transactionId),
    amount: String(transaction.amount),
  });

  const computedSig = crypto
    .createHmac("sha256", Buffer.from(process.env.VC_SECRET, "hex"))
    .update(hmacPayload)
    .digest("hex");

  const receivedBuf = Buffer.from(receivedSig, "hex");
  const computedBuf = Buffer.from(computedSig, "hex");

  if (receivedBuf.length !== computedBuf.length) {
    return { error: "Invalid security signature" };
  }

  if (!crypto.timingSafeEqual(receivedBuf, computedBuf)) {
    return { error: "Invalid security signature" };
  }
}

function checkContentType(req) {
  // Your content type check logic here, or leave empty if not needed
}

async function checkUrlSafety(url) {
  const parsed = new URL(url);
  const blockedExt = ["exe", "bat", "sh", "dmg", "apk", "msi", "jar", "cmd"];
  const ext = parsed.pathname.split(".").pop().toLowerCase();
  if (blockedExt.includes(ext)) return false;

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
