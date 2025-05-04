const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true },
    amount: { type: Number, required: true },
    clientShare: { type: String, required: true },
    serverShare: { type: String, required: true },
    hmac: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    expiresAt: { type: Date, index: { expires: "2m" } },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// const userSchema = new mongoose.Schema({
//   email: { type: String, unique: true },
//   paymentProfiles: [String],
// });

module.exports = {
  Transaction: mongoose.model("Transaction", transactionSchema),
  // User: mongoose.model("User", userSchema),
};
