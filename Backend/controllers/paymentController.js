const { Transaction } = require("../config/db");
const visualCrypto = require("../utils/visualCrypto");
const VC = new visualCrypto();
const Razorpay = require("razorpay");
const { checkUrlSafety, verifyHMAC } = require("../utils/secutiryCheck");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const { notifyTransaction } = require("../utils/websocket-server");

module.exports = {
  initiatePayment: async (req, res) => {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });

      const { amount } = req.body;

      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `txn_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      const transactionId = uuidv4();
      // const paymentUrl = `https://secure-pay.com/pay?amount=${amount}&dt=${Date.now()}&tx=${transactionId}`;
      const paymentUrl =
        process.env.BASE_URL + `/api/payments/verify?tx=${transactionId}`;
      // const paymentUrl = `http://malicious.com/evil.exe`;

      // Security checks
      if (!(await checkUrlSafety(paymentUrl))) {
        return res.status(403).json({ error: "Security validation failed" });
      }

      const token =
        req.headers["authorization"]?.split(" ")[1] || req.cookies.token;

      if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = jwt.verify(token, process.env.JWT_SECRET);

      // VC Share generation
      const { qrCode, share1, serverShare, hmac } = await VC.generateShares(
        paymentUrl,
        transactionId,
        userId.id,
        amount
      );

      // Store transaction
      const transaction = await Transaction.create({
        transactionId,
        userId: userId.id,
        amount: String(amount),
        orderId: order.id,
        clientShare: share1,
        serverShare: serverShare,
        hmac,
        expiresAt: new Date(Date.now() + 600000), // 3 minutes
      });

      // Set signature header
      // res.set("x-vc-signature", hmac);

      res.json({
        qrCode,
        hmac,
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
      const { tx: transactionId, s1: clientShare, hmac } = req.query;

      // Validate input
      if (!transactionId || !clientShare || !hmac) {
        return res.status(400).json({ error: "Missing required parameters" });
      }
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
      if (!paymentUrl.startsWith(process.env.BASE_URL)) {
        return res.status(403).json({ error: "Tampered QR code detected" });
      }

      // Verify HMAC
      const verify = verifyHMAC(req, paymentUrl, transaction);
      if (verify && verify.error) {
        return res.status(401).json(verify);
      }

      // Process payment
      const options = {
        key: process.env.RAZORPAY_KEY_ID,
        amount: transaction.amount * 100,
        currency: "INR",
        name: "myCompany",
        order_id: transaction.orderId,
        // handler: async (response) => {
        // Update transaction status
        // transaction.status = "completed";
        // transaction.paymentId = response.razorpay_payment_id;
        // await transaction.save();
        prefill: {
          name: "Sharim Ansari",
          email: "Ktq0i@example.com",
        },
        // Add other options as needed
      };

      transaction.status = "processing";
      await transaction.save();

      res.send(`
        <html>
          <head>
            <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          </head>
          <body>
            <script>
              var options = ${JSON.stringify(options)};
              options.handler = function (response){
                window.location.href = "/api/payments/success?payment_id=" + response.razorpay_payment_id +"&tx=${
                  transaction.transactionId
                }";
              };
              var rzp = new Razorpay(options);
              rzp.open();
            </script>
            <h3>Redirecting to payment...</h3>
          </body>
        </html>
      `);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  successPayment: async (req, res) => {
    // try {
    const { tx, payment_id } = req.query;

    if (!payment_id) {
      return res.status(400).json({ error: "Missing payment ID" });
    }

    // Find transaction by payment ID
    const transaction = await Transaction.findOne({
      transactionId: tx,
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Update transaction status
    transaction.status = "completed";
    await transaction.save();

    notifyTransaction(transaction.transactionId, {
      status: "Payment Successful",
      timestamp: Date.now(),
    });

    res.json({ message: "Payment successful", transaction });
    // } catch (error) {
    //   res.status(500).json({ error: "Payment handling failed" });
    // }
  },

  failurePayment: async (req, res) => {
    try {
      const { tx, payment_id } = req.query;

      if (!payment_id) {
        return res.status(400).json({ error: "Missing payment ID" });
      }

      // Find transaction by payment ID
      const transaction = await Transaction.findOne({
        paymentId: payment_id,
      });

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Update transaction status
      transaction.status = "failed";
      await transaction.save();

      res.json({ message: "Payment failed", transaction });
    } catch (error) {
      res.status(500).json({ error: "Payment failure handling failed" });
    }
  },
};
