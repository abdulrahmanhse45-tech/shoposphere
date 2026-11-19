import express from "express";
import {
  listProducts,
  listPublicCategories,
  getProductBySlug,
} from "../controllers/productController.js";

const router = express.Router();

// Public: anyone can browse the catalog (no login needed).
// The controller only ever returns published, non-deleted, in-stock products.
router.get("/categories", listPublicCategories); // keep above any "/:something" route
router.get("/", listProducts);
router.get("/:slug", getProductBySlug); // must stay LAST so it doesn't catch "/categories"

export default router;
