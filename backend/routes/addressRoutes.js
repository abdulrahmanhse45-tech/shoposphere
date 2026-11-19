import express from "express";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";
import { protect, checkBlocked } from "../middleware/authMiddleware.js";

const router = express.Router();

// All address routes require authenticated and non-blocked user
router.use(protect, checkBlocked);

router.route("/").get(getAddresses).post(addAddress);

router.route("/:id").put(updateAddress).delete(deleteAddress);

router.patch("/:id/default", setDefaultAddress);

export default router;
