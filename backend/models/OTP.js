import mongoose from "mongoose";

/**
 * OTP Schema
 * Handles temporary One-Time Passwords for:
 * - Registration verification
 * - Password resets
 * - Email update verification
 *
 * Automatically deleted when expiresAt is reached (MongoDB TTL index).
 */
const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["register", "reset_password", "change_email"],
      required: true,
    },
    // Optional metadata stored alongside OTP (e.g. pending name and hashed password for registration, or newEmail)
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // MongoDB TTL index to auto-delete expired OTPs
    },
  },
  {
    timestamps: true,
  }
);

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
