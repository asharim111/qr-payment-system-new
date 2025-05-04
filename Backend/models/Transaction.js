const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true },
    amount: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    qrData: { type: String }, // Client share
    serverShare: { type: String }, // VC server share
    hmac: { type: String }, // Cryptographic signature
    expiresAt: { type: Date }, // VC expiration
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
