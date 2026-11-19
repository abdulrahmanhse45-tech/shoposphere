import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Address from "../models/Address.js";
import OTP from "../models/OTP.js";
import { generateOTP, sendOTPEmail } from "../utils/sendEmail.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9()\s-]{7,20}$/;

/**
 * @desc    Get current user profile & saved addresses
 * @route   GET /api/users/profile
 * @access  Private (protect, checkBlocked)
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Fetch user's saved addresses
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        addresses,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update basic user profile details (Name, Phone, Profile Picture)
 * @route   PUT /api/users/profile
 * @access  Private (protect, checkBlocked)
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
        return res.status(400).json({ success: false, message: "Name must contain 2 to 80 characters." });
      }
      user.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || (phone.trim() && !PHONE_REGEX.test(phone.trim()))) {
        return res.status(400).json({ success: false, message: "Please provide a valid phone number." });
      }
      user.phone = phone.trim();
    }

    if (avatar !== undefined) {
      if (typeof avatar !== "string") {
        return res.status(400).json({ success: false, message: "Profile picture must be a URL." });
      }
      if (avatar.trim()) {
        try {
          const avatarUrl = new URL(avatar.trim());
          if (!["http:", "https:"].includes(avatarUrl.protocol)) throw new Error("invalid protocol");
        } catch {
          return res.status(400).json({ success: false, message: "Please provide a valid profile picture URL." });
        }
      }
      user.avatar = avatar.trim();
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isBlocked: updatedUser.isBlocked,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change user password with current password verification
 * @route   PUT /api/users/change-password
 * @access  Private (protect, checkBlocked)
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide both current and new password.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Hash new password (salt rounds = 10)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Step 1 of Email Change: Request OTP sent to the NEW email address
 * @route   POST /api/users/change-email/otp
 * @access  Private (protect, checkBlocked)
 */
export const sendChangeEmailOTP = async (req, res, next) => {
  try {
    const { newEmail } = req.body;

    if (typeof newEmail !== "string" || !newEmail.trim() || !EMAIL_REGEX.test(newEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid new email address.",
      });
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    // Check if same as current email
    if (normalizedNewEmail === req.user.email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "New email cannot be the same as your current email.",
      });
    }

    // Check if new email is already taken by another account
    const existing = await User.findOne({ email: normalizedNewEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
      });
    }

    const otp = generateOTP();

    // Remove any previous change_email OTPs for this user
    await OTP.deleteMany({
      email: normalizedNewEmail,
      purpose: "change_email",
    });

    await OTP.create({
      email: normalizedNewEmail,
      otp,
      purpose: "change_email",
      meta: {
        userId: req.user._id,
        newEmail: normalizedNewEmail,
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await sendOTPEmail({
      email: normalizedNewEmail,
      otp,
      purpose: "change_email",
    });

    res.status(200).json({
      success: true,
      message: `Verification code sent to ${normalizedNewEmail}. Valid for 5 minutes.`,
      newEmail: normalizedNewEmail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Step 2 of Email Change: Verify OTP and update email in User collection
 * @route   POST /api/users/change-email/verify
 * @access  Private (protect, checkBlocked)
 */
export const verifyAndChangeEmail = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(400).json({
        success: false,
        message: "New email and OTP are required.",
      });
    }

    const normalizedNewEmail = newEmail.toLowerCase().trim();

    const otpRecord = await OTP.findOne({
      email: normalizedNewEmail,
      purpose: "change_email",
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Verification code expired or not found. Please request a new code.",
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

    // Verify it belongs to the authenticated user
    if (otpRecord.meta.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized request origin.",
      });
    }

    // Update user's email
    const user = await User.findById(req.user._id);
    user.email = normalizedNewEmail;
    await user.save();

    // Clean up OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: "Email address successfully updated.",
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};
