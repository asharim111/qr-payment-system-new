const { Transaction } = require("../config/db");
const { generateShares, reconstructSecret } = require("../utils/visualCrypto");
const { checkUrlSafety, verifyHMAC } = require("../utils/secutiryCheck");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");

module.exports = {
  initiatePayment: async (req, res) => {
    try {
      const { amount } = req.body;
      const transactionId = uuidv4();
      const paymentUrl = `https://secure-pay.example/pay?amount=${amount}&dt=${Date.now()}&tx=${transactionId}`;

      // Security checks
      if (!(await checkUrlSafety(paymentUrl))) {
        return res.status(403).json({ error: "Security validation failed" });
      }

      // VC Share generation
      const shares = generateShares(paymentUrl);
      const qrCode = await QRCode.toDataURL(shares.client, {
        errorCorrectionLevel: "H",
        margin: 2,
      });

      // Generate HMAC
      const hmacPayload = JSON.stringify({
        transactionId: String(transactionId),
        amount: String(amount),
      });

      const hmac = crypto
        .createHmac("sha256", process.env.VC_SECRET)
        .update(hmacPayload)
        .digest("hex");

      // Store transaction
      const transaction = await Transaction.create({
        transactionId,
        amount: String(amount),
        clientShare: shares.client,
        serverShare: shares.server,
        hmac,
        expiresAt: new Date(Date.now() + 18000000), // 3 minutes
      });

      // Set signature header
      res.set("x-vc-signature", hmac);

      res.json({
        qrCode,
        transactionId: transaction.transactionId,
        expiresIn: 120,
      });
    } catch (error) {
      res.status(402).json({ error: "Payment initiation failed" });
    }
  },

  verifyPayment: async (req, res) => {
    // try {
    const { transactionId } = req.body;
    const transaction = await Transaction.findOne({
      transactionId,
    });

    // Validity checks
    if (!transaction || transaction.status !== "pending") {
      return res.status(410).json({ error: "Invalid transaction" });
    }

    // VC Reconstruction
    const secret = reconstructSecret(
      transaction.clientShare,
      transaction.serverShare
    );

    if (!secret.startsWith("https://secure-pay.example")) {
      return res.status(403).json({ error: "Tampered QR code detected" });
    }

    // Verify HMAC
    const verify = verifyHMAC(req, transaction);
    if (verify && verify.error) {
      return res.status(401).json(verify);
    }

    // Process payment
    transaction.status = "completed";
    await transaction.save();

    res.json({ status: "success", message: "Payment processed" });
    // } catch (error) {
    //   res.status(500).json({ error: "Payment verification failed" });
    // }
  },
};
