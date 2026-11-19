import mongoose from "mongoose";
import crypto from "crypto";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [2, "Product name must be at least 2 characters"],
      maxlength: [120, "Product name must be at most 120 characters"],
    },
    // URL-friendly id, generated from the name (see pre-validate hook below).
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [90, "Discount cannot be more than 90%"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    stock: {
      type: Number,
      required: [true, "Stock is required"],
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },
    // Image URLs (the upload step will fill these in later).
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 8,
        message: "A product can have at most 8 images",
      },
    },
    highlights: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 10 && arr.every((h) => h.length <= 150),
        message: "Up to 10 highlights, each at most 150 characters",
      },
    },
    // Admin controls: customers only ever see published, non-deleted products.
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Soft delete: never remove the document, only flip this flag.
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Price after discount, always calculated on the server from the stored values.
productSchema.virtual("finalPrice").get(function () {
  const discounted = this.price * (1 - (this.discountPercentage || 0) / 100);
  return Math.round(discounted * 100) / 100;
});

// Build a unique slug from the name, e.g. "Leather Bag" -> "leather-bag-a1b2c3".
// The random suffix avoids clashes when two products share a name.
productSchema.pre("validate", function () {
  if (this.isNew || this.isModified("name") || !this.slug) {
    const base = (this.name || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    this.slug = `${base || "product"}-${crypto.randomBytes(3).toString("hex")}`;
  }
});

// The ONE place that defines "visible to customers". Reuse it in every
// customer-facing query (listing, detail, related, cart, wishlist, checkout)
// so the rules never drift apart.
// NOTE: the category must also be active; the controllers check that part.
productSchema.statics.customerVisibleFilter = function () {
  return { isPublished: true, isDeleted: false, stock: { $gt: 0 } };
};

// Listing queries sort/filter by these.
productSchema.index({ createdAt: -1 });
productSchema.index({ price: 1 });
productSchema.index({ name: 1 });

const Product = mongoose.model("Product", productSchema);

export default Product;
