// Small helpers shared by the order pages.

// The same address services/api.js uses (set VITE_API_URL when hosting).
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABELS = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refund_pending: "Refund pending",
  refunded: "Refunded",
};

export const RETURN_LABELS = {
  none: "",
  requested: "Return requested",
  approved: "Return approved",
  rejected: "Return rejected",
};

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

export const statusColor = (status) =>
  ({
    pending: "#b7791f",
    confirmed: "#2b6cb0",
    shipped: "#6b46c1",
    out_for_delivery: "#c05621",
    delivered: "#2f855a",
    cancelled: "#c53030",
  }[status] || "#555");

// A downloaded invoice needs the login token, so a plain link will not work.
// We fetch the PDF with the token and save it as a file.
export const downloadInvoicePdf = async (order) => {
  const token = localStorage.getItem("shoposphere_token");
  const res = await fetch(`${API_URL}/orders/${order._id}/invoice`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    window.dispatchEvent(
      new CustomEvent("shoposphere_toast", {
        detail: { message: data.message || "Could not download the invoice", type: "error" },
      })
    );
    return;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${order.orderNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};