import express from "express";
import {
  getAllUsers,
  toggleBlockUser,
  getAdminStats,
} from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// All admin routes strictly require valid JWT and admin role
router.use(protect, adminOnly);

router.get("/users", getAllUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.get("/stats", getAdminStats);

export default router;
