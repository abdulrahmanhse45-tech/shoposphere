import Razorpay from "razorpay";
import { HttpError } from "./httpError.js";

// The keys live in backend/.env (never in code):
//   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
//   RAZORPAY_KEY_SECRET=xxxxxxxx
// They are read when first needed, so the server still starts without them
// (Cash on Delivery keeps working; only online payment says "not configured").
let client = null;

export const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new HttpError(503, "Online payments are not configured yet");
  }
  if (!client) client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
};

// DEVELOPMENT ONLY: with MOCK_PAYMENTS=true in .env, "online payment" is
// simulated, so the flow can be tested without Razorpay keys. It can never be
// switched on when NODE_ENV is "production".
export const isMockPayments = () =>
  process.env.MOCK_PAYMENTS === "true" && process.env.NODE_ENV !== "production";

// The key id is public (the payment window needs it). The SECRET never leaves the server.
export const razorpayKeyId = () => process.env.RAZORPAY_KEY_ID || "";