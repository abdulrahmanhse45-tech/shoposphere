import Order from "../models/Order.js";
import { HttpError } from "./httpError.js";
import { runAtomic, restoreStockForOrder, sessionOpts } from "./stockService.js";
import crypto from "crypto";
import { getRazorpay, razorpayKeyId, isMockPayments } from "./razorpay.js";

// Create a Razorpay payment order for one of OUR orders and remember its id.
// Used when placing an order and again when the customer retries a failed
// payment. It never creates a new order, only a new payment attempt.
export const startRazorpayPayment = async (order) => {
  // Development-only simulation (see utils/razorpay.js)
  if (isMockPayments()) {
    const mockId = `mock_order_${crypto.randomBytes(6).toString("hex")}`;
    order.razorpay.orderId = mockId;
    order.paymentStatus = "pending";
    order.paymentEvents.push({ event: "mock_payment_started", note: mockId });
    await order.save();
    return {
      mock: true,
      keyId: "mock",
      orderId: mockId,
      amount: Math.round(order.pricing.total * 100),
      currency: "INR",
    };
  }

  const rzp = getRazorpay();
  const rzpOrder = await rzp.orders.create({
    amount: Math.round(order.pricing.total * 100), // Razorpay wants paise
    currency: "INR",
    receipt: order.orderNumber,
  });

  order.razorpay.orderId = rzpOrder.id;
  order.paymentStatus = "pending";
  order.paymentEvents.push({ event: "razorpay_order_created", note: rzpOrder.id });
  await order.save();

  return {
    keyId: razorpayKeyId(),
    orderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
  };
};

// If the customer already paid online and the order is cancelled or a return
// is approved, give the money back. Safe to call twice: once refunded, the
// payment status is no longer "paid", so it does nothing.
export const refundIfPaid = async (orderId, note = "Order cancelled") => {
  const order = await Order.findById(orderId);
  if (!order || order.paymentStatus !== "paid") return order;

  if (order.paymentMethod === "RAZORPAY" && String(order.razorpay.paymentId).startsWith("mock_pay_")) {
    // simulated payment: nothing to refund at Razorpay
    order.paymentStatus = "refunded";
    order.paymentEvents.push({
      event: "refund_processed",
      razorpayPaymentId: order.razorpay.paymentId,
      note: `${note} (mock refund)`,
    });
  } else if (order.paymentMethod === "RAZORPAY" && order.razorpay.paymentId) {
    try {
      const rzp = getRazorpay();
      await rzp.payments.refund(order.razorpay.paymentId, {
        amount: Math.round(order.pricing.total * 100),
        notes: { orderNumber: order.orderNumber },
      });
      order.paymentStatus = "refunded";
      order.paymentEvents.push({
        event: "refund_processed",
        razorpayPaymentId: order.razorpay.paymentId,
        note,
      });
    } catch (err) {
      console.error("Razorpay refund failed:", err && (err.error || err.message || err));
      order.paymentStatus = "refund_pending";
      order.paymentEvents.push({
        event: "refund_failed",
        razorpayPaymentId: order.razorpay.paymentId,
        note: "Automatic refund failed. It needs a manual refund.",
      });
    }
  } else {
    // Cash collected on delivery: the shop returns the money by hand.
    order.paymentStatus = "refund_pending";
    order.paymentEvents.push({ event: "refund_pending", note });
  }

  await order.save();
  return order;
};

// The ONE function that cancels an order (customer or admin).
// In one transaction: mark it cancelled (only if still pending or confirmed)
// and put the stock back. The status check is part of the update itself, so
// pressing "cancel" twice can only ever cancel once.
export const cancelOrderCore = async ({ orderId, by, reason = "" }) => {
  const cleanReason = String(reason || "").trim().slice(0, 300);

  const cancelled = await runAtomic(async (session) => {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: ["pending", "confirmed"] } },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelledBy: by,
          cancelReason: cleanReason,
        },
        $push: { statusHistory: { status: "cancelled", by, note: cleanReason || "Order cancelled" } },
      },
      { new: true, ...sessionOpts(session) }
    );
    if (!order) throw new HttpError(409, "This order can no longer be cancelled");

    await restoreStockForOrder(order._id, session);
    return order;
  });

  return refundIfPaid(cancelled._id, "Order cancelled");
};