const { Transaction } = require("../config/db");
const visualCrypto = require("../utils/visualCrypto");
const VC = new visualCrypto();
const Razorpay = require("razorpay");
const { checkUrlSafety, verifyHMAC } = require("../utils/secutiryCheck");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");

module.exports = {
  initiatePayment: async (req, res) => {
    try {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_SECRET,
      });

      const { amount } = req.body;
      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `txn_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);

      const transactionId = uuidv4();
      // const paymentUrl = `https://secure-pay.com/pay?amount=${amount}&dt=${Date.now()}&tx=${transactionId}`;
      const paymentUrl = `https://f459-182-48-227-222.ngrok-free.app/api/payments/verify?tx=${transactionId}`;
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
      if (!req.query) {
        return res.status(400).json({ error: "No data provided" });
      }

      if (!req.query.s1) {
        return res.status(400).json({ error: "Client share is required" });
      }

      if (!req.query.hmac) {
        return res.status(400).json({ error: "Invalid transaction" });
      }

      const clientShare = req.query.s1 ?? null;
      const transactionId = req.query.tx ?? null;
      const hmac = req.query.hmac ?? null;
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

      console.log("Payment URL:", paymentUrl);

      // Security check
      if (
        !paymentUrl.startsWith("https://f459-182-48-227-222.ngrok-free.app")
      ) {
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
        // name: "Your Company",
        order_id: transaction.order_id,
        // prefill: {
        //   name: transaction.userName,
        //   email: transaction.userEmail,
        // },
        // Add other options as needed
      };

      res.send(`
    <html>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <script>
          var options = ${JSON.stringify(options)};
          options.handler = function (response){
            window.location.href = "/payment-success?payment_id=" + response.razorpay_payment_id;
          };
          var rzp = new Razorpay(options);
          rzp.open();
        </script>
        <h3>Redirecting to payment...</h3>
      </body>
    </html>
  `);

      transaction.status = "completed";
      await transaction.save();

      res.json({ status: "success", message: "Payment processed" });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },
};
