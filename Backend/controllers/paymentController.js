const { Transaction } = require("../config/db");
const visualCrypto = require("../utils/visualCrypto");
const VC = new visualCrypto();
const { checkUrlSafety, verifyHMAC } = require("../utils/secutiryCheck");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  initiatePayment: async (req, res) => {
    try {
      const { amount } = req.body;
      const transactionId = uuidv4();
      const paymentUrl = `https://secure-pay.com/pay?amount=${amount}&dt=${Date.now()}&tx=${transactionId}`;
      // const paymentUrl = `http://malicious.com/evil.exe`;

      // Security checks
      if (!(await checkUrlSafety(paymentUrl))) {
        return res.status(403).json({ error: "Security validation failed" });
      }

      // VC Share generation
      const { qrCode, serverShare, hmac } = await VC.generateShares(
        paymentUrl,
        amount,
        transactionId
      );

      // Store transaction
      const transaction = await Transaction.create({
        transactionId,
        amount: String(amount),
        clientShare: qrCode,
        serverShare: serverShare,
        hmac,
        expiresAt: new Date(Date.now() + 180000), // 3 minutes
      });

      // Set signature header
      res.set("x-vc-signature", hmac);

      res.json({
        qrCode,
        transactionId: transaction.transactionId,
      });
    } catch (error) {
      res
        .status(402)
        .json({ error: "Payment initiation failed : " + error.message });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "No data provided" });
      }
      if (!req.body.clientShare) {
        return res.status(400).json({ error: "Client share is required" });
      }
      const { transactionId, clientShare } = req.body;
      const transaction = await Transaction.findOne({
        transactionId,
      });

      // Validity checks
      if (!transaction || transaction.status !== "pending") {
        return res.status(410).json({ error: "Invalid transaction" });
      }

      const transactionExpiresAt = new Date(transaction.expiresAt).getTime();

      // Check if the transaction is expired
      if (!transaction || transactionExpiresAt < Date.now()) {
        return res
          .status(410)
          .json({ error: "Invalid or expired transaction" });
      }

      // VC Reconstruction
      const paymentUrl = await VC.reconstructSecret(
        String(clientShare),
        transaction.serverShare
      );

      // Security check
      if (!paymentUrl.startsWith("https://secure-pay.com")) {
        return res.status(403).json({ error: "Tampered QR code detected" });
      }

      // Verify HMAC
      const verify = verifyHMAC(req, paymentUrl, transaction);
      if (verify && verify.error) {
        return res.status(401).json(verify);
      }

      // Process payment
      transaction.status = "completed";
      await transaction.save();

      res.json({ status: "success", message: "Payment processed" });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },
};
