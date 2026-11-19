import express from "express";
import {
  sendRegistrationOTP,
  resendRegistrationOTP,
  verifyOTPAndRegister,
  login,
  adminLogin,
  sendPasswordResetOTP,
  resetPassword,
} from "../controllers/authController.js";
import { authLimiter, otpLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Registration with OTP Flow
router.post("/register-otp", otpLimiter, sendRegistrationOTP);
router.post("/resend-register-otp", otpLimiter, resendRegistrationOTP);
router.post("/verify-register-otp", verifyOTPAndRegister);

// Authentication Endpoints
router.post("/login", authLimiter, login);
router.post("/admin/login", authLimiter, adminLogin);

// Forgot & Reset Password Flow
router.post("/forgot-password", otpLimiter, sendPasswordResetOTP);
router.post("/reset-password", resetPassword);

export default router;
