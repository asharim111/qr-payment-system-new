const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    username: { type: String, unique: true },
    email: { type: String },
    password: { type: String },
    confirmPassword: { type: String },
    mfaSecret: { type: String }, // Store MFA secret for the user
    isMfaEnabled: { type: Boolean, default: false },
  },
  {
    timestamps: {
      createdOn: "created",
      modifiedOn: "modified",
    },
  }
);

module.exports = mongoose.model("User", userSchema);
