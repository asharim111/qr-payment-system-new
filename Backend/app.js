require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const paymentRoutes = require("./routes/routes");
const Razorpay = require("razorpay");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");
require("dotenv").config();
const { securityMiddleware } = require("./utils/secutiryCheck");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");

// Initialize Express
const app = express();

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Handle CORS
const cors = require("cors");
app.use(
  cors({
    credentials: true,
    origin: process.env.ORIGINS.split(","),
  })
);
app.use(cookieParser());

// Middleware
app.use(express.json());
app.use(express.static("public"));
// app.use(securityMiddleware);

// Verify Payment Endpoint
// app.post('/verify-payment', (req, res) => {
//   const { orderId, paymentId, signature } = req.body;
//   const generatedSignature = crypto
//     .createHmac('sha256', process.env.RAZORPAY_SECRET)
//     .update(`${orderId}|${paymentId}`)
//     .digest('hex');

//   if (generatedSignature === signature) {
//     res.json({ success: true });
//   } else {
//     res.status(400).json({ success: false });
//   }
// });

// Routes
app.use("/api/payments", paymentRoutes);

// Preventing brute force attacks
const loginLimiter = rateLimit({
  windowMs: 0.1 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
});

app.post("/api/users/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res.status(401).send({
      status: "fail",
      message: "User not found",
    });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).send({
      status: "fail",
      message: "Invalid credentials",
    });
  }

  if (user.isMfaEnabled) {
    const secret = speakeasy.generateSecret();
    user.mfaSecret = secret.base32; // Save base32 secret to DB
    await user.save();

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `MFA (${user.email})`,
      issuer: "YourAppName",
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return res.json({
      userId: user._id,
      message: "MFA required",
      qrCodeDataUrl,
    });
  } else {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, {
      // httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
      // secure: true, // Ensures cookies are only sent over HTTPS in production
      maxAge: 60 * 60 * 1000, // 1 hour expiration time
    });

    const qrCode = await QRCode.toDataURL(token);
    return res.status(200).json({ message: "Login successful", token, qrCode });
    // return res.status(200).json({ token });
  }
});

app.post("/api/users/logout", (req, res) => {
  res.clearCookie("token");
  res.send();
});

app.get("/", (req, res) => {
  // res.send(process.env.ORIGINS);
  res.send("HELLO API WWROKING");
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
