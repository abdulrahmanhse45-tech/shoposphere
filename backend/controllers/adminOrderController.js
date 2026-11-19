import mongoose from "mongoose";
import Order from "../models/Order.js";
import { HttpError, sendError } from "../utils/httpError.js";
import { runAtomic, restoreStockForOrder, sessionOpts } from "../utils/stockService.js";
import { cancelOrderCore, refundIfPaid } from "../utils/orderService.js";
import { ORDER_STATUSES, STATUS_LABELS, canTransition, nextStatuses } from "../utils/orderStatus.js";
import { escapeRegex, isValidId } from "../utils/text.js";

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  total_desc: { "pricing.total": -1, _id: 1 },
  total_asc: { "pricing.total": 1, _id: 1 },
};

const PAYMENT_STATUSES = ["pending", "paid", "failed", "refund_pending", "refunded"];

// GET /api/admin/orders?search=&status=&paymentStatus=&returnStatus=&sort=&page=&limit=
export const adminListOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sortKey = req.query.sort || "newest";
    if (!SORTS[sortKey]) throw new HttpError(400, "Invalid sort option");

    const filter = {};

    // Search by order number, or by the customer's name or email.
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      const User = mongoose.model("User");
      const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
        .select("_id")
        .limit(200);
      filter.$or = [{ orderNumber: rx }, { user: { $in: users.map((u) => u._id) } }];
    }
    if (req.query.status) {
      if (!ORDER_STATUSES.includes(req.query.status)) throw new HttpError(400, "Invalid status filter");
      filter.status = req.query.status;
    }
    if (req.query.paymentStatus) {
      if (!PAYMENT_STATUSES.includes(req.query.paymentStatus)) throw new HttpError(400, "Invalid payment filter");
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.returnStatus) {
      if (!["requested", "approved", "rejected"].includes(req.query.returnStatus)) {
        throw new HttpError(400, "Invalid return filter");
      }
      filter["returnRequest.status"] = req.query.returnStatus;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select("-statusHistory -paymentEvents")
        .populate("user", "name email phone")
        .sort(SORTS[sortKey])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    sendError(res, err, "Failed to load orders");
  }
};

// GET /api/admin/orders/:id   (full details, including the history)
export const adminGetOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw new HttpError(400, "Invalid order id");

    const order = await Order.findById(id).populate("user", "name email phone");
    if (!order) throw new HttpError(404, "Order not found");

    res.json({ order, allowedNextStatuses: nextStatuses(order.status) });
  } catch (err) {
    sendError(res, err, "Failed to load order");
  }
};

// PATCH /api/admin/orders/:id/status   body: { status, reason? }
// Only the changes allowed in utils/orderStatus.js are accepted.
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw new HttpError(400, "Invalid order id");

    const next = String(req.body.status || "");
    if (!ORDER_STATUSES.includes(next)) throw new HttpError(400, "Invalid status");

    const order = await Order.findById(id);
    if (!order) throw new HttpError(404, "Order not found");

    if (!canTransition(order.status, next)) {
      throw new HttpError(
        400,
        `An order that is "${STATUS_LABELS[order.status]}" cannot be changed to "${STATUS_LABELS[next]}"`
      );
    }

    // Cancelling also puts the stock back and starts any refund.
    if (next === "cancelled") {
      const updated = await cancelOrderCore({ orderId: id, by: "admin", reason: req.body.reason });
      return res.json({ message: "Order cancelled", order: updated });
    }

    // An online order that was never paid must not be shipped.
    if (order.paymentMethod === "RAZORPAY" && order.paymentStatus !== "paid") {
      throw new HttpError(409, "The online payment for this order has not been completed");
    }

    const set = { status: next };
    const push = { statusHistory: { status: next, by: "admin", note: "" } };

    if (next === "delivered") {
      set.deliveredAt = new Date();
      // Cash on Delivery is paid when the parcel is handed over.
      if (order.paymentMethod === "COD" && order.paymentStatus === "pending") {
        set.paymentStatus = "paid";
        set.paidAt = new Date();
        push.paymentEvents = { event: "cod_collected", note: "Cash collected on delivery" };
      }
    }

    // The old status is part of the filter: if someone else changed the order
    // a moment ago, this update does nothing instead of overwriting them.
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: order.status },
      { $set: set, $push: push },
      { new: true }
    );
    if (!updated) throw new HttpError(409, "This order was just changed by someone else. Please refresh.");

    res.json({ message: `Order marked as ${STATUS_LABELS[next]}`, order: updated });
  } catch (err) {
    sendError(res, err, "Failed to update order status");
  }
};

// PATCH /api/admin/orders/:id/return   body: { action: "approve" | "reject", note? }
export const reviewReturn = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) throw new HttpError(400, "Invalid order id");

    const action = String(req.body.action || "");
    if (!["approve", "reject"].includes(action)) {
      throw new HttpError(400, 'Action must be "approve" or "reject"');
    }
    const note = typeof req.body.note === "string" ? req.body.note.trim().slice(0, 300) : "";
    const newStatus = action === "approve" ? "approved" : "rejected";

    // One transaction: record the decision and (if approved) put the stock back.
    await runAtomic(async (session) => {
      const claimed = await Order.findOneAndUpdate(
        { _id: id, "returnRequest.status": "requested" },
        {
          $set: {
            "returnRequest.status": newStatus,
            "returnRequest.reviewedAt": new Date(),
            "returnRequest.adminNote": note,
          },
          $push: { statusHistory: { status: `return_${newStatus}`, by: "admin", note } },
        },
        { new: true, ...sessionOpts(session) }
      );
      if (!claimed) throw new HttpError(409, "There is no pending return request on this order");

      if (action === "approve") await restoreStockForOrder(id, session);
    });

    let order = await Order.findById(id);
    if (action === "approve") order = await refundIfPaid(id, "Return approved");

    res.json({ message: action === "approve" ? "Return approved" : "Return rejected", order });
  } catch (err) {
    sendError(res, err, "Failed to review return");
  }
};