import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { openRazorpay } from "../utils/razorpayCheckout";

// Shown when an online payment fails or the window is closed.
// The order already exists, so "Retry" pays for the SAME order. No duplicate is created.
const OrderFailed = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.order))
      .catch(() => {});
  }, [id]);

  const retry = async () => {
    setBusy(true);
    try {
      const res = await api.post(`/payments/${id}/razorpay-order`);
      await openRazorpay({
        order,
        payment: res.payment,
        user,
        onPaid: () => navigate(`/order-success/${id}`, { replace: true }),
        onFailed: () => navigate(0),
        onDismiss: () => {},
      });
    } catch {
      /* api.js shows the message */
    } finally {
      setBusy(false);
    }
  };

  const canRetry = order && order.canRetryPayment;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 16px", textAlign: "center" }}>
      <h1>Payment was not completed</h1>
      <p>No money has been taken for an unfinished payment. Your order is saved, so you can try again.</p>
      {order && (
        <p>
          Order number: <strong>{order.orderNumber}</strong>
        </p>
      )}
      {canRetry && (
        <button type="button" onClick={retry} disabled={busy} style={{ padding: "12px 28px", cursor: "pointer" }}>
          {busy ? "Please wait..." : "Retry payment"}
        </button>
      )}
      {order && !canRetry && order.paymentStatus === "paid" && <p>This order is already paid.</p>}
      <p style={{ marginTop: 20 }}>
        <Link to={`/orders/${id}`}>View order</Link> · <Link to="/orders">My orders</Link>
      </p>
    </div>
  );
};

export default OrderFailed;
