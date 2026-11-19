import Cart from "../models/Cart.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import { buildCartView } from "./cartController.js";
import { calculatePricing } from "../utils/pricing.js";
import { HttpError, sendError } from "../utils/httpError.js";
import { runAtomic, deductStockForOrder, sessionOpts } from "../utils/stockService.js";
import { cancelOrderCore, startRazorpayPayment } from "../utils/orderService.js";
import { ORDER_STATUSES, isCancellableByCustomer, isReturnable } from "../utils/orderStatus.js";
import { streamInvoice } from "../utils/invoice.js";
import { escapeRegex, isValidId } from "../utils/text.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// What the customer's screen needs to know about what they may do next.
const flagsFor = (order) => ({
  canCancel: isCancellableByCustomer(order),
  canReturn: isReturnable(order),
  canRetryPayment:
    order.paymentMethod === "RAZORPAY" &&
    order.status === "pending" &&
    ["pending", "failed"].includes(order.paymentStatus),
});

const withFlags = (order) => ({ ...order.toObject(), ...flagsFor(order) });

// The cart, re-checked against the real products right now.
const loadCheckoutCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  const view = await buildCartView(cart);

  if (view.items.length === 0) throw new HttpError(400, "Your cart is empty");
  if (!view.canCheckout) {
    throw new HttpError(409, "Some items in your cart are unavailable or exceed the available stock.", {
      issues: view.items
        .filter((i) => !i.valid)
        .map((i) => ({ productId: i.productId, name: i.product ? i.product.name : null, issue: i.issue })),
    });
  }
  return { view, pricing: calculatePricing(view.total) };
};

const findMyOrder = async (req) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new HttpError(400, "Invalid order id");
  // The owner check is part of the query: someone else's order simply "does not exist".
  const order = await Order.findOne({ _id: id, user: req.user._id });
  if (!order) throw new HttpError(404, "Order not found");
  return order;
};

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

// GET /api/orders/checkout-summary
// What the checkout page shows: items, quantities, totals, shipping, tax and
// the final payable amount. All numbers are calculated here.
export const getCheckoutSummary = async (req, res) => {
  try {
    const { view, pricing } = await loadCheckoutCart(req.user._id);
    res.json({ items: view.items, itemCount: view.itemCount, pricing });
  } catch (err) {
    sendError(res, err, "Failed to prepare checkout");
  }
};

// POST /api/orders   body: { addressId, paymentMethod: "COD" | "RAZORPAY", idempotencyKey }
export const placeOrder = async (req, res) => {
  const userId = req.user._id;
  const key = typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey.trim() : "";

  try {
    const { addressId } = req.body;
    const paymentMethod = String(req.body.paymentMethod || "").toUpperCase();

    if (!isValidId(addressId)) throw new HttpError(400, "Please choose a delivery address");
    if (!["COD", "RAZORPAY"].includes(paymentMethod)) {
      throw new HttpError(400, "Please choose a payment method");
    }
    if (key && !/^[A-Za-z0-9_-]{8,100}$/.test(key)) {
      throw new HttpError(400, "Invalid request key");
    }

    // DUPLICATE PROTECTION: the page sends the same key for every attempt of
    // ONE purchase. If we already made that order, return it instead of a second one.
    if (key) {
      const existing = await Order.findOne({ user: userId, idempotencyKey: key });
      if (existing) {
        return res.json({ message: "This order was already placed", order: withFlags(existing), duplicate: true });
      }
    }

    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new HttpError(400, "Selected address was not found");

    // Everything below comes from the database, never from the page.
    const { view, pricing } = await loadCheckoutCart(userId);

    const doc = {
      user: userId,
      items: view.items.map((i) => ({
        product: i.productId,
        name: i.product.name,
        image: i.product.image || "",
        quantity: i.quantity,
        originalPrice: i.product.price,
        discountPercentage: i.product.discountPercentage,
        unitPrice: i.product.finalPrice,
        lineTotal: i.lineTotal,
      })),
      // A COPY of the address, so later edits never change an old order.
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        streetAddress: address.streetAddress,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        addressType: address.addressType,
      },
      pricing,
      paymentMethod,
      // Cash on Delivery is confirmed straight away. An online order stays
      // "pending" until the payment is verified.
      status: paymentMethod === "COD" ? "confirmed" : "pending",
      paymentStatus: "pending",
      statusHistory: [
        {
          status: paymentMethod === "COD" ? "confirmed" : "pending",
          by: "system",
          note: paymentMethod === "COD" ? "Cash on Delivery order placed" : "Order created, waiting for payment",
        },
      ],
    };
    if (key) doc.idempotencyKey = key;

    // One transaction: create the order, take the stock (COD only) and empty
    // the cart. If any step fails, none of it is kept.
    const orderId = await runAtomic(async (session) => {
      const opts = sessionOpts(session);
      const [created] = await Order.create([doc], opts);
      if (paymentMethod === "COD") await deductStockForOrder(created._id, session);
      await Cart.updateOne({ user: userId }, { $set: { items: [] } }, opts);
      return created._id;
    });

    const order = await Order.findById(orderId);

    // Online payment: ask Razorpay for a payment, and send the details the
    // payment window needs. If this fails the order still exists, and the
    // customer can retry from "My Orders" (no duplicate order).
    let payment = null;
    let paymentError = "";
    if (paymentMethod === "RAZORPAY") {
      try {
        payment = await startRazorpayPayment(order);
      } catch (err) {
        console.error("Could not start Razorpay payment:", err && (err.error || err.message || err));
        paymentError = "Your order was created, but online payment could not be started. You can retry from My Orders.";
      }
    }

    res.status(201).json({
      message: paymentMethod === "COD" ? "Order placed successfully" : "Order created. Please complete the payment.",
      order: withFlags(order),
      payment,
      paymentError,
    });
  } catch (err) {
    // Two identical requests at the same moment: the database's unique key
    // lets only one through. Return the order that won.
    if (err && err.code === 11000 && key) {
      const existing = await Order.findOne({ user: userId, idempotencyKey: key });
      if (existing) {
        return res.json({ message: "This order was already placed", order: withFlags(existing), duplicate: true });
      }
    }
    sendError(res, err, "Failed to place order");
  }
};

// ---------------------------------------------------------------------------
// My orders
// ---------------------------------------------------------------------------

// GET /api/orders?search=&status=&page=1&limit=10   (newest first, my orders only)
export const listMyOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 50);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const filter = { user: req.user._id };
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ orderNumber: rx }, { "items.name": rx }];
    }
    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select("-statusHistory -paymentEvents")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders: orders.map((o) => ({ ...o, ...flagsFor(o) })),
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    sendError(res, err, "Failed to load orders");
  }
};

// GET /api/orders/:id
export const getMyOrder = async (req, res) => {
  try {
    const order = await findMyOrder(req);
    res.json({ order: withFlags(order) });
  } catch (err) {
    sendError(res, err, "Failed to load order");
  }
};

// POST /api/orders/:id/cancel   body: { reason? }
export const cancelMyOrder = async (req, res) => {
  try {
    const order = await findMyOrder(req);
    if (!isCancellableByCustomer(order)) {
      throw new HttpError(409, "This order can no longer be cancelled because it has already been shipped");
    }
    const updated = await cancelOrderCore({ orderId: order._id, by: "customer", reason: req.body.reason });
    res.json({ message: "Order cancelled", order: withFlags(updated) });
  } catch (err) {
    sendError(res, err, "Failed to cancel order");
  }
};

// POST /api/orders/:id/return   body: { reason }   (reason is mandatory)
export const requestReturn = async (req, res) => {
  try {
    const order = await findMyOrder(req);

    const reason = typeof req.body.reason === "string" ? req.body.reason.trim() : "";
    if (reason.length < 5) throw new HttpError(400, "Please tell us the reason for the return (at least 5 characters)");
    if (reason.length > 300) throw new HttpError(400, "The reason must be at most 300 characters");

    if (!isReturnable(order)) {
      throw new HttpError(409, "This order is not eligible for a return");
    }

    // The conditions are part of the update, so a double click can only create one request.
    const updated = await Order.findOneAndUpdate(
      { _id: order._id, user: req.user._id, status: "delivered", "returnRequest.status": "none" },
      {
        $set: {
          "returnRequest.status": "requested",
          "returnRequest.reason": reason,
          "returnRequest.requestedAt": new Date(),
        },
        $push: { statusHistory: { status: "return_requested", by: "customer", note: reason } },
      },
      { new: true }
    );
    if (!updated) throw new HttpError(409, "A return was already requested for this order");

    res.json({ message: "Return requested. We will review it shortly.", order: withFlags(updated) });
  } catch (err) {
    sendError(res, err, "Failed to request return");
  }
};

// GET /api/orders/:id/invoice   -> PDF download
export const downloadInvoice = async (req, res) => {
  try {
    const order = await findMyOrder(req);
    if (order.status === "cancelled") {
      throw new HttpError(409, "No invoice is available for a cancelled order");
    }
    streamInvoice(order, res);
  } catch (err) {
    sendError(res, err, "Failed to create invoice");
  }
};