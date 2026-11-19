import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  sendChangeEmailOTP,
  verifyAndChangeEmail,
} from "../controllers/userController.js";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";
import { otpLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// All user routes require authentication and active non-blocked status
router.use(protect, checkBlocked);

router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.put("/change-password", changePassword);

// Verify email update with OTP
router.post("/change-email/otp", otpLimiter, sendChangeEmailOTP);
router.post("/change-email/verify", verifyAndChangeEmail);

export default router;
