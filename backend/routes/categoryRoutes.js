import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const router = express.Router();

// Every category route needs a valid login AND the admin role.
router.use(protect, adminOnly);

router.route("/").get(listCategories).post(createCategory);
router.route("/:id").put(updateCategory).delete(deleteCategory);

export default router;
