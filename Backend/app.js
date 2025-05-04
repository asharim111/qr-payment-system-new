require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const paymentRoutes = require("./routes/routes");
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

// Middleware
app.use(express.json());
app.use(express.static("public"));
// app.use(securityMiddleware);

// Routes
app.use("/api/payments", paymentRoutes);

// Preventing brute force attacks
const loginLimiter = rateLimit({
  windowMs: 0.1 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message:
    "Too many login attempts from this IP, please try again after 15 minutes",
});

const SECRET_KEY = "12345678";

app.post("/api/users/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
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
    const token = jwt.sign(
      { id: user._id, username: user.username },
      SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );
    res.cookie("token", token, {
      httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
      secure: true, // Ensures cookies are only sent over HTTPS in production
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

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
