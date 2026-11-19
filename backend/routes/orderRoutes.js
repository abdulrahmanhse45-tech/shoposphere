import express from "express";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";
import {
  getCheckoutSummary,
  placeOrder,
  listMyOrders,
  getMyOrder,
  cancelMyOrder,
  requestReturn,
  downloadInvoice,
} from "../controllers/orderController.js";

const router = express.Router();

// Every order route needs a valid login and a non-blocked account.
// Each controller also checks that the order belongs to the logged-in user.
router.use(protect, checkBlocked);

router.get("/checkout-summary", getCheckoutSummary); // keep above "/:id"
router.route("/").get(listMyOrders).post(placeOrder);
router.get("/:id", getMyOrder);
router.post("/:id/cancel", cancelMyOrder);
router.post("/:id/return", requestReturn);
router.get("/:id/invoice", downloadInvoice);

export default router;