import express from "express";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";
import { retryPayment, verifyPayment, reportPaymentFailure } from "../controllers/paymentController.js";

const router = express.Router();

router.use(protect, checkBlocked);

router.post("/verify", verifyPayment);
router.post("/:orderId/razorpay-order", retryPayment);
router.post("/:orderId/failed", reportPaymentFailure);

export default router;