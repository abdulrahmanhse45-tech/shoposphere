import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [50, "Category name must be at most 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description must be at most 300 characters"],
      default: "",
    },
    // Soft delete: we never remove the document, we only flip this flag.
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
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// Two ACTIVE categories cannot share a name (case-insensitive: "Shoes" = "shoes").
// Deleted categories are ignored, so a name can be reused after deletion.
categorySchema.index(
  { name: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
    collation: { locale: "en", strength: 2 },
  }
);

// Supports the admin list, which is always sorted latest first.
categorySchema.index({ createdAt: -1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
