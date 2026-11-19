import express from "express";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  validateCheckout,
} from "../controllers/cartController.js";

const router = express.Router();

// Every cart route needs a valid login and a non-blocked account.
router.use(protect, checkBlocked);

router.get("/", getCart);
router.post("/items", addToCart);
router.patch("/items/:productId", updateCartItem);
router.delete("/items/:productId", removeCartItem);
router.post("/checkout-validation", validateCheckout);

export default router;
