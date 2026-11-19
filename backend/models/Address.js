import mongoose from "mongoose";

/**
 * Address Schema
 * Stores multiple delivery addresses per user with support for a default address badge.
 */
const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [80, "Full name cannot exceed 80 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[0-9()\s-]{7,20}$/, "Please provide a valid phone number"],
    },
    streetAddress: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
      minlength: [5, "Street address must be at least 5 characters"],
      maxlength: [160, "Street address cannot exceed 160 characters"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      minlength: [2, "City must be at least 2 characters"],
      maxlength: [60, "City cannot exceed 60 characters"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
      minlength: [2, "State must be at least 2 characters"],
      maxlength: [60, "State cannot exceed 60 characters"],
    },
    postalCode: {
      type: String,
      required: [true, "Postal / ZIP code is required"],
      trim: true,
      match: [/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/, "Please provide a valid postal / ZIP code"],
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    addressType: {
      type: String,
      enum: ["Home", "Work", "Other"],
      default: "Home",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Address = mongoose.model("Address", addressSchema);

export default Address;
