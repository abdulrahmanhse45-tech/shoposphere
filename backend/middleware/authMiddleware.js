import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * Authentication Middleware: protect
 * Verifies JWT from the 'Authorization: Bearer <token>' header and attaches user to req.user.
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "shoposphere_secret_jwt_key_fallback"
    );

    // Fetch user from DB without password field
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }
};

/**
 * Blocked Status Middleware: checkBlocked
 * Ensures that users with isBlocked === true are immediately rejected with 403 Forbidden.
 * Must be used in conjunction with protect.
 */
export const checkBlocked = (req, res, next) => {
  if (req.user && req.user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked. Please contact support.",
    });
  }
  next();
};

/**
 * Role-Based Access Control: adminOnly
 * Ensures that only users with role === 'admin' can access sensitive admin endpoints.
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin privileges required.",
  });
};
