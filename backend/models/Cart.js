import mongoose from "mongoose";

// The most of any ONE product a customer can hold in their cart.
export const MAX_QUANTITY_PER_ITEM = 10;

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [MAX_QUANTITY_PER_ITEM, `Maximum ${MAX_QUANTITY_PER_ITEM} per product`],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },
  },
  { _id: false }
);

// NOTE: the cart stores ONLY product ids and quantities. It never stores a
// price or stock figure, so nothing in here can go stale or be tampered with.
// Prices and stock are always read fresh from the Product record.
const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one cart per user
    },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
