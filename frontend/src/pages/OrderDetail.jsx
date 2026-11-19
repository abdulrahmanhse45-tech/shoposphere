import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { imageUrl, formatPrice } from "../utils/imageUrl";
import { STATUS_LABELS, PAYMENT_LABELS, RETURN_LABELS, formatDate, statusColor, downloadInvoicePdf } from "../utils/orderUi";
import { openRazorpay } from "../utils/razorpayCheckout";

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 20 };

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(""); // "cancel" | "return" | ""
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.order);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cancel = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/orders/${id}/cancel`, { reason }); // reason is optional
      setOrder(res.order);
      setPanel("");
      setReason("");
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusy(false);
    }
  };

  const requestReturn = async () => {
    if (reason.trim().length < 5) return setError("Please enter a reason (at least 5 characters)");
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/orders/${id}/return`, { reason });
      setOrder(res.order);
      setPanel("");
      setReason("");
    } catch (err) {
      setError(err.message);
      load();
    } finally {
      setBusy(false);
    }
  };

  const retryPayment = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/payments/${id}/razorpay-order`);
      await openRazorpay({
        order,
        payment: res.payment,
        user,
        onPaid: () => navigate(`/order-success/${id}`, { replace: true }),
        onFailed: () => load(),
        onDismiss: () => load(),
      });
    } catch {
      /* message shown by api.js */
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>Loading...</div>;
  if (!order) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <p>Order not found.</p>
        <Link to="/orders">Back to my orders</Link>
      </div>
    );
  }

  const a = order.shippingAddress;
  const rr = order.returnRequest || { status: "none" };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <Link to="/orders">← My orders</Link>
      <h1 style={{ marginBottom: 4 }}>Order {order.orderNumber}</h1>
      <div style={{ marginBottom: 16 }}>
        Placed on {formatDate(order.createdAt)} ·{" "}
        <strong style={{ color: statusColor(order.status) }}>{STATUS_LABELS[order.status]}</strong> ·{" "}
        {order.paymentMethod === "COD" ? "Cash on Delivery" : "Online"} - {PAYMENT_LABELS[order.paymentStatus]}
        {rr.status !== "none" && <> · {RETURN_LABELS[rr.status]}</>}
      </div>

      {order.status === "cancelled" && (
        <p style={{ color: "crimson" }}>
          Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ""}
          {order.cancelReason ? `: ${order.cancelReason}` : ""}
        </p>
      )}

      <div style={box}>
        <h2 style={{ marginTop: 0 }}>Items</h2>
        {order.items.map((i, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <img src={imageUrl(i.image)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4, background: "#f2f2f2" }} />
            <div style={{ flex: 1 }}>
              {i.name}
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {formatPrice(i.unitPrice)} x {i.quantity}
              </div>
            </div>
            <strong>{formatPrice(i.lineTotal)}</strong>
          </div>
        ))}
        <div style={{ textAlign: "right", marginTop: 12, lineHeight: 1.8 }}>
          <div>Subtotal: {formatPrice(order.pricing.subtotal)}</div>
          <div>Shipping: {order.pricing.shippingCharge === 0 ? "Free" : formatPrice(order.pricing.shippingCharge)}</div>
          <div>Tax: {formatPrice(order.pricing.tax)}</div>
          <div style={{ fontSize: 20 }}>
            Total: <strong>{formatPrice(order.pricing.total)}</strong>
          </div>
        </div>
      </div>

      <div style={box}>
        <h2 style={{ marginTop: 0 }}>Delivery address</h2>
        <div>{a.fullName}</div>
        <div>{a.streetAddress}</div>
        <div>
          {a.city}, {a.state} {a.postalCode}
        </div>
        <div>Phone: {a.phone}</div>
      </div>

      <div style={box}>
        <h2 style={{ marginTop: 0 }}>Status history</h2>
        {(order.statusHistory || []).map((h, idx) => (
          <div key={idx} style={{ padding: "4px 0", fontSize: 14 }}>
            <strong>{STATUS_LABELS[h.status] || h.status.replace(/_/g, " ")}</strong> · {formatDate(h.at)}
            {h.note ? ` · ${h.note}` : ""}
          </div>
        ))}
        {rr.status !== "none" && (
          <p style={{ fontSize: 14 }}>
            Return reason: {rr.reason}
            {rr.adminNote ? ` · Shop note: ${rr.adminNote}` : ""}
          </p>
        )}
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {order.canRetryPayment && (
          <button type="button" onClick={retryPayment} disabled={busy}>
            Pay now
          </button>
        )}
        {order.canCancel && (
          <button type="button" onClick={() => { setPanel("cancel"); setError(""); }} disabled={busy}>
            Cancel order
          </button>
        )}
        {order.canReturn && (
          <button type="button" onClick={() => { setPanel("return"); setError(""); }} disabled={busy}>
            Request return
          </button>
        )}
        {order.status !== "cancelled" && (
          <button type="button" onClick={() => downloadInvoicePdf(order)}>
            Download invoice (PDF)
          </button>
        )}
      </div>

      {panel && (
        <div style={{ ...box, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>{panel === "cancel" ? "Cancel this order" : "Request a return"}</h3>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder={panel === "cancel" ? "Reason (optional)" : "Reason for return (required)"}
            style={{ width: "100%", boxSizing: "border-box", padding: 8 }}
          />
          <div style={{ marginTop: 8 }}>
            <button type="button" disabled={busy} onClick={panel === "cancel" ? cancel : requestReturn}>
              {panel === "cancel" ? "Confirm cancellation" : "Submit return request"}
            </button>{" "}
            <button type="button" onClick={() => setPanel("")}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
