import crypto from "crypto";
import Order from "../models/Order.js";
import { HttpError, sendError } from "../utils/httpError.js";
import { getRazorpay, isMockPayments } from "../utils/razorpay.js";
import { runAtomic, deductStockForOrder, sessionOpts } from "../utils/stockService.js";
import { refundIfPaid, startRazorpayPayment } from "../utils/orderService.js";
import { isValidId } from "../utils/text.js";

const findMyRazorpayOrder = async (req) => {
  const { orderId } = req.params;
  if (!isValidId(orderId)) throw new HttpError(400, "Invalid order id");
  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order || order.paymentMethod !== "RAZORPAY") throw new HttpError(404, "Order not found");
  return order;
};

// POST /api/payments/:orderId/razorpay-order
// RETRY: start a new payment attempt for the SAME order. No new order is created.
export const retryPayment = async (req, res) => {
  try {
    const order = await findMyRazorpayOrder(req);

    if (order.paymentStatus === "paid") throw new HttpError(409, "This order is already paid");
    if (order.status !== "pending" || !["pending", "failed"].includes(order.paymentStatus)) {
      throw new HttpError(409, "Payment can no longer be started for this order");
    }

    const payment = await startRazorpayPayment(order);
    res.json({ message: "Payment ready", payment });
  } catch (err) {
    sendError(res, err, "Could not start the payment");
  }
};

// POST /api/payments/verify
// body: { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }
//
// The browser says "I paid". We do NOT believe it. We check:
//   1. the signature (proves the answer really came from Razorpay),
//   2. the payment itself, asking Razorpay directly (status and amount),
// and only then confirm the order and take the stock.
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!isValidId(orderId)) throw new HttpError(400, "Invalid order id");
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v)) {
      throw new HttpError(400, "Payment details are missing");
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order || order.paymentMethod !== "RAZORPAY") throw new HttpError(404, "Order not found");

    // IDEMPOTENT: verifying twice is harmless. Already paid? Just say so.
    if (order.paymentStatus === "paid") {
      return res.json({ message: "Payment already verified", order });
    }
    if (order.status === "cancelled") throw new HttpError(409, "This order has been cancelled");
    if (razorpay_order_id !== order.razorpay.orderId) {
      throw new HttpError(400, "This payment does not belong to the current payment attempt");
    }

    // Development-only simulation: a mock order accepts only mock payment ids.
    const mock = isMockPayments() && razorpay_order_id.startsWith("mock_order_");
    if (mock && !razorpay_payment_id.startsWith("mock_pay_")) {
      throw new HttpError(400, "Payment verification failed");
    }

    if (!mock) {
    const rzp = getRazorpay(); // also checks the keys exist

    // 1. Signature: HMAC-SHA256 of "razorpayOrderId|paymentId" with our secret key.
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(razorpay_signature);
    const signatureOk = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!signatureOk) {
      order.paymentEvents.push({ event: "signature_mismatch", razorpayPaymentId: razorpay_payment_id });
      await order.save();
      throw new HttpError(400, "Payment verification failed");
    }

    // 2. Ask Razorpay for the real payment record.
    let payment;
    try {
      payment = await rzp.payments.fetch(razorpay_payment_id);
      if (payment.status === "authorized") {
        payment = await rzp.payments.capture(razorpay_payment_id, payment.amount, payment.currency);
      }
    } catch (err) {
      console.error("Could not read the payment from Razorpay:", err && (err.error || err.message || err));
      throw new HttpError(502, "Could not confirm the payment with Razorpay. Please try again in a moment.");
    }

    if (
      payment.order_id !== order.razorpay.orderId ||
      payment.status !== "captured" ||
      payment.amount !== Math.round(order.pricing.total * 100)
    ) {
      order.paymentStatus = "failed";
      order.paymentEvents.push({
        event: "payment_not_valid",
        razorpayPaymentId: razorpay_payment_id,
        note: `status=${payment.status}`,
      });
      await order.save();
      throw new HttpError(402, "The payment was not completed. You can retry from My Orders.");
    }
    } // end of the real-Razorpay checks (skipped only for development mock payments)

    // 3. Confirm the order and take the stock, in one transaction.
    try {
      await runAtomic(async (session) => {
        const claimed = await Order.findOneAndUpdate(
          { _id: order._id, paymentStatus: { $ne: "paid" }, status: "pending" },
          {
            $set: {
              paymentStatus: "paid",
              paidAt: new Date(),
              status: "confirmed",
              "razorpay.paymentId": razorpay_payment_id,
            },
            $push: {
              statusHistory: { status: "confirmed", by: "system", note: "Online payment verified" },
              paymentEvents: { event: "payment_verified", razorpayPaymentId: razorpay_payment_id },
            },
          },
          { new: true, ...sessionOpts(session) }
        );
        if (!claimed) return false; // another request already finished this
        await deductStockForOrder(order._id, session);
        return true;
      });
    } catch (err) {
      if (err instanceof HttpError && err.extra && err.extra.code === "OUT_OF_STOCK") {
        // The customer paid, but the last item was taken meanwhile.
        // Cancel the order and give the money back.
        await Order.updateOne(
          { _id: order._id, status: { $in: ["pending", "confirmed"] } },
          {
            $set: {
              status: "cancelled",
              cancelledAt: new Date(),
              cancelledBy: "system",
              cancelReason: "An item went out of stock before the payment was confirmed",
              paymentStatus: "paid",
              paidAt: new Date(),
              "razorpay.paymentId": razorpay_payment_id,
            },
            $push: {
              statusHistory: { status: "cancelled", by: "system", note: "Out of stock after payment" },
              paymentEvents: { event: "payment_verified", razorpayPaymentId: razorpay_payment_id },
            },
          }
        );
        await refundIfPaid(order._id, "Out of stock after payment");
        throw new HttpError(
          409,
          "Sorry, an item sold out while you were paying. The order was cancelled and your payment is being refunded."
        );
      }
      throw err;
    }

    const fresh = await Order.findById(order._id);
    res.json({ message: "Payment successful", order: fresh });
  } catch (err) {
    sendError(res, err, "Payment verification failed");
  }
};

// POST /api/payments/:orderId/failed   body: { reason?, razorpayPaymentId? }
// The payment window reports a failure. This can only mark a not-yet-paid
// order as "failed" (so the page can offer a retry). It can never mark one paid.
export const reportPaymentFailure = async (req, res) => {
  try {
    const order = await findMyRazorpayOrder(req);
    if (order.paymentStatus === "paid") return res.json({ message: "Payment already completed", order });

    const reason = typeof req.body.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";
    const paymentId = typeof req.body.razorpayPaymentId === "string" ? req.body.razorpayPaymentId.slice(0, 60) : "";

    if (order.status === "pending" && order.paymentStatus !== "failed") {
      order.paymentStatus = "failed";
      order.paymentEvents.push({ event: "payment_failed", razorpayPaymentId: paymentId, note: reason });
      await order.save();
    }
    res.json({ message: "Payment failed. You can retry from My Orders.", order });
  } catch (err) {
    sendError(res, err, "Could not record the payment failure");
  }
};