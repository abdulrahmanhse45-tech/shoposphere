import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Schema
 * Represents customer and admin accounts in the ShopSphere platform.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
);

/**
 * Password comparison helper method
 * Compares plain text candidate password with hashed password stored in MongoDB
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
