import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { uploadProductImages } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Only a logged-in admin can upload. Checked BEFORE any file is accepted.
router.use(protect, adminOnly);

// POST /api/admin/uploads/products   (multipart form, field name: "images")
// Returns the saved paths, e.g. ["/uploads/products/1730-ab12cd.jpg"].
// The admin product form then sends these paths in the product's "images"
// list, which the product API already accepts.
router.post("/products", uploadProductImages, (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "Please choose at least one image" });
  }
  const images = req.files.map((file) => `/uploads/products/${file.filename}`);
  res.status(201).json({ message: "Images uploaded", images });
});

export default router;
