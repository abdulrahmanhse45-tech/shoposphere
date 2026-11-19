import rateLimit from "express-rate-limit";

/**
 * Rate Limiter for Authentication Endpoints (Login, Register)
 * Prevents brute force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 auth requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login/registration attempts from this IP. Please try again after 15 minutes.",
  },
});

/**
 * Rate Limiter for OTP Generation Endpoints
 * Prevents OTP bombing and spamming.
 */
export const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15, // Limit each IP to 15 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please wait a few minutes before trying again.",
  },
});
