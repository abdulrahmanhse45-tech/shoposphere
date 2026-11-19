import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  adminListOrders,
  adminGetOrder,
  updateOrderStatus,
  reviewReturn,
} from "../controllers/adminOrderController.js";

const router = express.Router();

// Every order-management route needs a valid login AND the admin role.
router.use(protect, adminOnly);

router.get("/", adminListOrders);
router.get("/:id", adminGetOrder);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/return", reviewReturn);

export default router;