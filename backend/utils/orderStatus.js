// The single place that says what an order's status may become next.
// Controllers call these helpers instead of writing their own if-statements,
// so every screen and API follows exactly the same rules.

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

// Nice names for screens and invoices.
export const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// "From this status, an admin may move the order to ONLY these statuses."
// An empty list means the order is finished and cannot change any more.
// (Returns are tracked separately in order.returnRequest, so a delivered
// order stays "delivered" even if a return is requested.)
const ALLOWED_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from, to) =>
  Array.isArray(ALLOWED_TRANSITIONS[from]) && ALLOWED_TRANSITIONS[from].includes(to);

export const nextStatuses = (from) => ALLOWED_TRANSITIONS[from] || [];

// A customer may cancel only before the order has been shipped.
export const isCancellableByCustomer = (order) =>
  order.status === "pending" || order.status === "confirmed";

// A customer may request a return only for a delivered order, within this
// many days of delivery, and only once.
export const RETURN_WINDOW_DAYS = 7;

export const isReturnable = (order) => {
  if (order.status !== "delivered") return false;
  if (order.returnRequest && order.returnRequest.status !== "none") return false;
  if (!order.deliveredAt) return false;
  const msSinceDelivery = Date.now() - new Date(order.deliveredAt).getTime();
  return msSinceDelivery <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};