import bcrypt from "bcryptjs";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import generateToken from "../utils/generateToken.js";
import { generateOTP, sendOTPEmail } from "../utils/sendEmail.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc    Step 1 of Registration: Validate input, generate OTP, hash password, and send OTP
 * @route   POST /api/auth/register-otp
 * @access  Public
 */
export const sendRegistrationOTP = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password.",
      });
    }

    if (name.trim().length < 2 || name.trim().length > 80) {
      return res.status(400).json({ success: false, message: "Name must contain 2 to 80 characters." });
    }

    // 2. Validate email format
    if (!EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    // 3. Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });
    }

    // 4. Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 5. Generate 6-digit OTP and hash the password for temporary staging
    const otp = generateOTP();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Store OTP with pending registration details (valid for 5 minutes)
    // Delete any old pending registration OTPs for this email first
    await OTP.deleteMany({ email: normalizedEmail, purpose: "register" });

    await OTP.create({
      email: normalizedEmail,
      otp,
      purpose: "register",
      meta: {
        name: name.trim(),
        hashedPassword,
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiration
    });

    // 7. Dispatch OTP via email or console fallback
    await sendOTPEmail({
      email: normalizedEmail,
      otp,
      purpose: "register",
    });

    res.status(200).json({
      success: true,
      message: "Verification code sent to your email. Valid for 5 minutes.",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP for pending registration
 * @route   POST /api/auth/resend-register-otp
 * @access  Public
 */
export const resendRegistrationOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address to resend the verification code.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if an existing registration staging record exists
    const existingOTPRecord = await OTP.findOne({
      email: normalizedEmail,
      purpose: "register",
    });

    if (!existingOTPRecord) {
      return res.status(400).json({
        success: false,
        message: "No pending registration found. Please start registration again.",
      });
    }

    // Generate fresh OTP
    const freshOTP = generateOTP();
    existingOTPRecord.otp = freshOTP;
    existingOTPRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await existingOTPRecord.save();

    await sendOTPEmail({
      email: normalizedEmail,
      otp: freshOTP,
      purpose: "register",
    });

    res.status(200).json({
      success: true,
      message: "A fresh verification code has been dispatched to your email.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Step 2 of Registration: Verify OTP and create user account
 * @route   POST /api/auth/verify-register-otp
 * @access  Public
 */
export const verifyOTPAndRegister = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP verification code are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Locate the OTP record
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      purpose: "register",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired or not found. Please request a new code.",
      });
    }

    // Check expiration
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please click 'Resend OTP'.",
      });
    }

    // Check OTP match
    if (otpRecord.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check and try again.",
      });
    }

    // Check again if user exists (edge case where user registered simultaneously)
    const alreadyExists = await User.findOne({ email: normalizedEmail });
    if (alreadyExists) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(409).json({
        success: false,
        message: "Account with this email already exists.",
      });
    }

    // Create the confirmed user account
    const newUser = await User.create({
      name: otpRecord.meta.name,
      email: normalizedEmail,
      password: otpRecord.meta.hashedPassword,
      role: "customer",
      isBlocked: false,
    });

    // Clean up OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Issue JWT token
    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "Account created and verified successfully.",
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isBlocked: newUser.isBlocked,
        phone: newUser.phone,
        avatar: newUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate customer user & return token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    // Compare entered password with stored bcrypt hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isBlocked: user.isBlocked,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Admin Portal Sign-In (Restricted strictly to role: 'admin')
 * @route   POST /api/auth/admin/login
 * @access  Public
 */
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both admin email and password.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const admin = await User.findOne({ email: normalizedEmail });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    // Validate admin role
    if (admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access forbidden. You do not have administrator permissions.",
      });
    }

    // Check if admin is blocked (edge case safety)
    if (admin.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated. Contact system owner.",
      });
    }

    // Validate password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials.",
      });
    }

    const token = generateToken(admin._id, admin.role);

    res.status(200).json({
      success: true,
      message: "Admin authenticated successfully.",
      token,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send OTP for Password Reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const sendPasswordResetOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (typeof email !== "string" || !email.trim() || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid registered email address.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account registered with this email address.",
      });
    }

    const otp = generateOTP();

    // Remove any previous reset OTP for this email
    await OTP.deleteMany({ email: normalizedEmail, purpose: "reset_password" });

    await OTP.create({
      email: normalizedEmail,
      otp,
      purpose: "reset_password",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTPEmail({
      email: normalizedEmail,
      otp,
      purpose: "reset_password",
    });

    res.status(200).json({
      success: true,
      message: "Password reset verification code sent to your email.",
      email: normalizedEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP and Reset Password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are all required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP record
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      purpose: "reset_password",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired or invalid. Please request a new code.",
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    if (otpRecord.otp !== otp.toString().trim()) {
      return res.status(400).json({
        success: false,
        message: "Incorrect verification code.",
      });
    }

    // Hash the new password with salt rounds = 10
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password in database
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      { password: hashedPassword }
    );

    // Cleanup OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    next(error);
  }
};
