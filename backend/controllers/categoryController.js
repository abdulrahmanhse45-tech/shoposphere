import mongoose from "mongoose";
import Category from "../models/Category.js";

// Escape user text so characters like ( or * can't break the search regex.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Same-name check, case-insensitive, among ACTIVE categories only.
const nameExists = async (name, excludeId = null) => {
  const query = {
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    isDeleted: false,
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Category.exists(query);
};

// Shared validation for create and update.
const validateInput = ({ name, description }) => {
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";

  if (!cleanName) return { error: "Category name is required" };
  if (cleanName.length < 2 || cleanName.length > 50) {
    return { error: "Category name must be between 2 and 50 characters" };
  }
  if (cleanDescription.length > 300) {
    return { error: "Description must be at most 300 characters" };
  }
  return { cleanName, cleanDescription };
};

// GET /api/admin/categories?search=&page=1&limit=10
// Backend search + pagination, latest first, never returns deleted categories.
export const listCategories = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter = { isDeleted: false };
    if (search) filter.name = new RegExp(escapeRegex(search), "i");

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Category.countDocuments(filter),
    ]);

    res.json({
      categories,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load categories" });
  }
};

// POST /api/admin/categories
export const createCategory = async (req, res) => {
  try {
    const { error, cleanName, cleanDescription } = validateInput(req.body);
    if (error) return res.status(400).json({ message: error });

    if (await nameExists(cleanName)) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }

    const category = await Category.create({
      name: cleanName,
      description: cleanDescription,
    });
    res.status(201).json({ message: "Category created", category });
  } catch (error) {
    // Safety net if two requests race past the check above.
    if (error.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    res.status(500).json({ message: "Failed to create category" });
  }
};

// PUT /api/admin/categories/:id
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid category id" });

    const { error, cleanName, cleanDescription } = validateInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (await nameExists(cleanName, id)) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }

    category.name = cleanName;
    category.description = cleanDescription;
    await category.save();

    res.json({ message: "Category updated", category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A category with this name already exists" });
    }
    res.status(500).json({ message: "Failed to update category" });
  }
};

// DELETE /api/admin/categories/:id  (soft delete: the record stays in MongoDB)
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid category id" });

    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) return res.status(404).json({ message: "Category not found" });

    category.isDeleted = true;
    category.deletedAt = new Date();
    await category.save();

    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete category" });
  }
};
