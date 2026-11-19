import express from "express";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  moveToCart,
} from "../controllers/wishlistController.js";

const router = express.Router();

// Every wishlist route needs a valid login and a non-blocked account.
router.use(protect, checkBlocked);

router.get("/", getWishlist);
router.post("/items", addToWishlist);
router.delete("/items/:productId", removeFromWishlist);
router.post("/items/:productId/move-to-cart", moveToCart);

export default router;
