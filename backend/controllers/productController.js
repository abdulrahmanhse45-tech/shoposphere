import mongoose from "mongoose";
import Product from "../models/Product.js";
import Category from "../models/Category.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Escape user text so characters like ( or * can't break the search regex.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Images must be a web URL or a path on our own server (the upload step in
// Day 2 will produce /uploads/... paths).
const IMAGE_PATTERN = /^(https?:\/\/|\/uploads\/)\S+$/i;

const isBlank = (value) => value === undefined || value === null || value === "";

const handleError = (res, error, fallbackMessage) => {
  if (error.name === "ValidationError") {
    const first = Object.values(error.errors)[0];
    return res.status(400).json({ message: first.message });
  }
  return res.status(500).json({ message: fallbackMessage });
};

// Reads ONLY the fields we allow from req.body (so a client can't sneak in
// isDeleted, slug, _id etc.) and validates every one of them.
// Returns { error } or { data }.
const parseProductInput = async (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 120) {
    return { error: "Product name must be between 2 and 120 characters" };
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length < 10 || description.length > 2000) {
    return { error: "Description must be between 10 and 2000 characters" };
  }

  const price = Number(body.price);
  if (isBlank(body.price) || !Number.isFinite(price) || price <= 0 || price > 10000000) {
    return { error: "Price must be a number greater than 0" };
  }

  const discountPercentage = isBlank(body.discountPercentage) ? 0 : Number(body.discountPercentage);
  if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 90) {
    return { error: "Discount must be a number between 0 and 90" };
  }

  const stock = Number(body.stock);
  if (isBlank(body.stock) || !Number.isInteger(stock) || stock < 0 || stock > 1000000) {
    return { error: "Stock must be a whole number of 0 or more" };
  }

  // The category must exist and must not be soft-deleted.
  if (!isValidId(body.category)) {
    return { error: "Please choose a valid category" };
  }
  const category = await Category.findOne({ _id: body.category, isDeleted: false });
  if (!category) {
    return { error: "Selected category does not exist" };
  }

  let images = [];
  if (!isBlank(body.images)) {
    if (!Array.isArray(body.images)) return { error: "Images must be a list" };
    images = body.images.map((img) => (typeof img === "string" ? img.trim() : ""));
    if (images.length > 8) return { error: "A product can have at most 8 images" };
    if (images.some((img) => !IMAGE_PATTERN.test(img))) {
      return { error: "Each image must be a valid image URL" };
    }
  }

  let highlights = [];
  if (!isBlank(body.highlights)) {
    if (!Array.isArray(body.highlights)) return { error: "Highlights must be a list" };
    highlights = body.highlights
      .map((h) => (typeof h === "string" ? h.trim() : ""))
      .filter(Boolean);
    if (highlights.length > 10) return { error: "At most 10 highlights are allowed" };
    if (highlights.some((h) => h.length > 150)) {
      return { error: "Each highlight must be at most 150 characters" };
    }
  }

  const isPublished = body.isPublished === true || body.isPublished === "true";

  return {
    data: {
      name,
      description,
      price: Math.round(price * 100) / 100,
      discountPercentage,
      stock,
      category: category._id,
      images,
      highlights,
      isPublished,
    },
  };
};

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------

// GET /api/admin/products?search=&category=&status=&page=1&limit=10
// status: "published" | "unpublished" (optional). Deleted products never show.
export const adminListProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter = { isDeleted: false };
    if (search) filter.name = new RegExp(escapeRegex(search), "i");
    if (req.query.category) {
      if (!isValidId(req.query.category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      filter.category = req.query.category;
    }
    if (req.query.status === "published") filter.isPublished = true;
    if (req.query.status === "unpublished") filter.isPublished = false;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate("category", "name isDeleted")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      products,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load products" });
  }
};

// GET /api/admin/products/:id  (used to fill the edit form)
export const adminGetProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product id" });

    const product = await Product.findOne({ _id: id, isDeleted: false }).populate(
      "category",
      "name isDeleted"
    );
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ product });
  } catch (error) {
    res.status(500).json({ message: "Failed to load product" });
  }
};

// POST /api/admin/products
export const createProduct = async (req, res) => {
  try {
    const { error, data } = await parseProductInput(req.body);
    if (error) return res.status(400).json({ message: error });

    const product = await Product.create(data);
    await product.populate("category", "name isDeleted");

    res.status(201).json({ message: "Product created", product });
  } catch (error) {
    handleError(res, error, "Failed to create product");
  }
};

// PUT /api/admin/products/:id  (full update from the edit form)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product id" });

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { error, data } = await parseProductInput(req.body);
    if (error) return res.status(400).json({ message: error });

    product.set(data);
    await product.save();
    await product.populate("category", "name isDeleted");

    res.json({ message: "Product updated", product });
  } catch (error) {
    handleError(res, error, "Failed to update product");
  }
};

// PATCH /api/admin/products/:id/publish   body: { "isPublished": true | false }
export const setPublishStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product id" });

    const { isPublished } = req.body;
    if (typeof isPublished !== "boolean") {
      return res.status(400).json({ message: "isPublished must be true or false" });
    }

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.isPublished = isPublished;
    await product.save();

    res.json({
      message: isPublished ? "Product published" : "Product unpublished",
      product,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to change publish status" });
  }
};

// DELETE /api/admin/products/:id  (soft delete: the record stays in MongoDB)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid product id" });

    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) return res.status(404).json({ message: "Product not found" });

    product.isDeleted = true;
    product.deletedAt = new Date();
    await product.save();

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product" });
  }
};

// ---------------------------------------------------------------------------
// Customer endpoints (public: no login needed to browse)
// ---------------------------------------------------------------------------

// Allowed sort options. "price" means the price AFTER discount, because that
// is the price the customer actually sees. _id is a tie-breaker so pages never
// repeat or skip items.
const SORT_OPTIONS = {
  newest: { createdAt: -1, _id: -1 },
  price_asc: { finalPrice: 1, _id: 1 },
  price_desc: { finalPrice: -1, _id: 1 },
  name_asc: { name: 1, _id: 1 },
  name_desc: { name: -1, _id: 1 },
};

// GET /api/products?search=&category=&minPrice=&maxPrice=&sort=&page=1&limit=12
// sort: newest (default) | price_asc | price_desc | name_asc | name_desc
// Search, filters, sorting and pagination all combine in ONE query.
export const listProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 48);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const sortKey = req.query.sort || "newest";
    if (!SORT_OPTIONS[sortKey]) {
      return res.status(400).json({ message: "Invalid sort option" });
    }

    let minPrice;
    let maxPrice;
    if (!isBlank(req.query.minPrice)) {
      minPrice = Number(req.query.minPrice);
      if (!Number.isFinite(minPrice) || minPrice < 0) {
        return res.status(400).json({ message: "Minimum price must be a number of 0 or more" });
      }
    }
    if (!isBlank(req.query.maxPrice)) {
      maxPrice = Number(req.query.maxPrice);
      if (!Number.isFinite(maxPrice) || maxPrice < 0) {
        return res.status(400).json({ message: "Maximum price must be a number of 0 or more" });
      }
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      return res.status(400).json({ message: "Minimum price cannot be more than maximum price" });
    }

    // Only products whose category is still active may be shown.
    const activeCategoryIds = await Category.find({ isDeleted: false }).distinct("_id");
    let categoryFilter = { $in: activeCategoryIds };

    if (req.query.category) {
      if (!isValidId(req.query.category)) {
        return res.status(400).json({ message: "Invalid category id" });
      }
      const wanted = String(req.query.category);
      if (!activeCategoryIds.some((id) => id.equals(wanted))) {
        // Deleted or unknown category: nothing to show.
        return res.json({ products: [], page, limit, total: 0, totalPages: 1 });
      }
      categoryFilter = new mongoose.Types.ObjectId(wanted);
    }

    // The shared visibility rule: published, not deleted, in stock.
    const match = { ...Product.customerVisibleFilter(), category: categoryFilter };
    if (search) match.name = new RegExp(escapeRegex(search), "i");

    const priceMatch = {};
    if (minPrice !== undefined) priceMatch.$gte = minPrice;
    if (maxPrice !== undefined) priceMatch.$lte = maxPrice;

    const pipeline = [
      { $match: match },
      {
        // finalPrice = price after discount, calculated in the database.
        $addFields: {
          finalPrice: {
            $round: [
              {
                $multiply: [
                  "$price",
                  { $subtract: [1, { $divide: [{ $ifNull: ["$discountPercentage", 0] }, 100] }] },
                ],
              },
              2,
            ],
          },
        },
      },
    ];
    if (Object.keys(priceMatch).length) pipeline.push({ $match: { finalPrice: priceMatch } });

    pipeline.push(
      { $sort: SORT_OPTIONS[sortKey] },
      {
        $facet: {
          items: [
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: Category.collection.name,
                localField: "category",
                foreignField: "_id",
                as: "category",
              },
            },
            { $unwind: "$category" },
            {
              $project: {
                name: 1,
                slug: 1,
                price: 1,
                discountPercentage: 1,
                finalPrice: 1,
                stock: 1,
                images: 1,
                "category._id": 1,
                "category.name": 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      }
    );

    // Case-insensitive collation so "apple" and "Banana" sort A-Z properly.
    const [result] = await Product.aggregate(pipeline).collation({ locale: "en", strength: 2 });

    const total = result.total[0]?.count || 0;
    res.json({
      products: result.items,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load products" });
  }
};

// GET /api/products/categories  (active categories, for the filter dropdown)
export const listPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isDeleted: false })
      .select("name")
      .sort({ name: 1 })
      .collation({ locale: "en", strength: 2 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: "Failed to load categories" });
  }
};

// GET /api/products/:slug
// One product + up to 4 related products from the same category.
// If the product is unpublished, deleted, out of stock, or its category is
// deleted, we answer 404 and the frontend sends the customer back to the listing.
export const getProductBySlug = async (req, res) => {
  try {
    const slug = String(req.params.slug || "").toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(404).json({ message: "This product is no longer available" });
    }

    const product = await Product.findOne({
      slug,
      ...Product.customerVisibleFilter(),
    }).populate("category", "name isDeleted");

    if (!product || !product.category || product.category.isDeleted) {
      return res.status(404).json({ message: "This product is no longer available" });
    }

    // Related products follow the exact same visibility rules.
    const related = await Product.find({
      ...Product.customerVisibleFilter(),
      category: product.category._id,
      _id: { $ne: product._id },
    })
      .select("name slug price discountPercentage stock images")
      .sort({ createdAt: -1 })
      .limit(4);

    res.json({
      product,
      stockStatus: product.stock <= 5 ? `Only ${product.stock} left` : "In stock",
      related,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to load product" });
  }
};
