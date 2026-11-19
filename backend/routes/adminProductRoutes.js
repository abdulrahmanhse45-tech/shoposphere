import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  adminListProducts,
  adminGetProduct,
  createProduct,
  updateProduct,
  setPublishStatus,
  deleteProduct,
} from "../controllers/productController.js";

const router = express.Router();

// Every product-management route needs a valid login AND the admin role.
router.use(protect, adminOnly);

router.route("/").get(adminListProducts).post(createProduct);
router.patch("/:id/publish", setPublishStatus);
router.route("/:id").get(adminGetProduct).put(updateProduct).delete(deleteProduct);

export default router;
