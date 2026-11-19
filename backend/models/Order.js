import mongoose from "mongoose";
import crypto from "crypto";
import { ORDER_STATUSES } from "../utils/orderStatus.js";


const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true }, // copied
    image: { type: String, default: "" }, // copied (first image)
    quantity: { type: Number, required: true, min: 1 },
    originalPrice: { type: Number, required: true, min: 0 }, // price before discount, copied
    discountPercentage: { type: Number, default: 0 }, // copied
    unitPrice: { type: Number, required: true, min: 0 }, // price actually paid per item
    lineTotal: { type: Number, required: true, min: 0 }, // unitPrice x quantity
  },
  { _id: false }
);

// A copy of the Address document (same field names as models/Address.js).
const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    streetAddress: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: "India" },
    addressType: { type: String, default: "Home" },
  },
  { _id: false }
);

// One line per status change, so an admin can see exactly what happened.
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: "system" }, // "customer", "admin" or "system"
    note: { type: String, default: "" },
  },
  { _id: false }
);

// One line per payment event (created, verified, failed, refunded...).
const paymentEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    at: { type: Date, default: Date.now },
    razorpayPaymentId: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Human-friendly unique id shown to the customer, e.g. SS-20261110-A1B2C3
    orderNumber: { type: String, unique: true, index: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    items: {
      type: [orderItemSchema],
      validate: { validator: (arr) => arr.length > 0, message: "An order needs at least one item" },
    },

    shippingAddress: { type: shippingAddressSchema, required: true },

    // All money is worked out on the server when the order is placed.
    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      shippingCharge: { type: Number, default: 0, min: 0 },
      tax: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 }, // the final payable amount
    },

    // ---- Order status (see utils/orderStatus.js for the allowed changes) ----
    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    deliveredAt: { type: Date, default: null },

    // ---- Payment ----
    paymentMethod: { type: String, enum: ["COD", "RAZORPAY"], required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refund_pending", "refunded"],
      default: "pending",
    },
    paidAt: { type: Date, default: null },
    razorpay: {
      orderId: { type: String, default: "" }, // created by Razorpay for this order
      paymentId: { type: String, default: "" }, // filled in after a verified payment
    },
    paymentEvents: { type: [paymentEventSchema], default: [] },

    // ---- Cancellation ----
    cancelReason: { type: String, default: "", maxlength: 300 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: String, enum: ["", "customer", "admin", "system"], default: "" },

    // ---- Return request (separate from status, so "delivered" stays delivered) ----
    returnRequest: {
      status: {
        type: String,
        enum: ["none", "requested", "approved", "rejected"],
        default: "none",
      },
      reason: { type: String, default: "", maxlength: 300 }, // mandatory when requesting
      requestedAt: { type: Date, default: null },
      reviewedAt: { type: Date, default: null },
      adminNote: { type: String, default: "", maxlength: 300 },
    },

    // ---- Stock safety flags ----
    // Each stock change may happen ONLY ONCE per order. These flags are checked
    // and set in the same database step as the stock update, so retrying a
    // request (double click, network retry) can never change stock twice.
    stockDeducted: { type: Boolean, default: false },
    stockRestored: { type: Boolean, default: false },

    // The page sends a random key with "place order". Sending the same key
    // again returns the same order instead of creating a duplicate.
    idempotencyKey: { type: String, default: undefined },

    statusHistory: { type: [statusHistorySchema], default: [] },
  },
  { timestamps: true }
);

// Same user + same key = same order. Only enforced when a key was sent.
orderSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

// Newest first is the default list order.
orderSchema.index({ createdAt: -1 });

// Make the order number automatically, e.g. SS-20261110-A1B2C3.
orderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getDate()
    ).padStart(2, "0")}`;
    this.orderNumber = `SS-${day}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }
});

const Order = mongoose.model("Order", orderSchema);

export default Order;