import api from "../services/api";

// Razorpay's payment window is a script that must be loaded from Razorpay.
const loadScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

// Opens the payment window for one of OUR orders.
//   payment = { keyId, orderId, amount, currency }   (from the backend)
//   callbacks: onPaid(order), onFailed(), onDismiss()
//
// IMPORTANT: when the window says "paid", we do NOT trust it. We send the
// proof to our backend (/payments/verify), which checks it with Razorpay.
export const openRazorpay = async ({ order, payment, user, onPaid, onFailed, onDismiss }) => {
  // DEVELOPMENT ONLY: the backend runs in mock-payment mode (MOCK_PAYMENTS=true).
  // A simple prompt stands in for the payment window.
  if (payment.mock) {
    const pays = window.confirm(
      `MOCK PAYMENT (development only)\n\nOrder ${order.orderNumber}\nAmount: Rs. ${(payment.amount / 100).toFixed(2)}\n\nOK = payment succeeds\nCancel = payment fails`
    );
    if (!pays) {
      try {
        await api.post(`/payments/${order._id}/failed`, { reason: "Mock payment declined" });
      } catch {
        /* the failure page loads the real state anyway */
      }
      onFailed && onFailed();
      return;
    }
    try {
      const res = await api.post("/payments/verify", {
        orderId: order._id,
        razorpay_order_id: payment.orderId,
        razorpay_payment_id: `mock_pay_${Math.random().toString(36).slice(2, 12)}`,
        razorpay_signature: "mock",
      });
      onPaid && onPaid(res.order);
    } catch {
      onFailed && onFailed();
    }
    return;
  }

  const ok = await loadScript();
  if (!ok) {
    window.dispatchEvent(
      new CustomEvent("shoposphere_toast", {
        detail: { message: "Could not load the payment window. Check your internet.", type: "error" },
      })
    );
    onFailed && onFailed();
    return;
  }

  let finished = false;

  const rzp = new window.Razorpay({
    key: payment.keyId,
    amount: payment.amount,
    currency: payment.currency,
    order_id: payment.orderId,
    name: "ShopSphere",
    description: `Order ${order.orderNumber}`,
    prefill: { name: user ? user.name : "", email: user ? user.email : "" },
    handler: async (response) => {
      finished = true;
      try {
        const res = await api.post("/payments/verify", {
          orderId: order._id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
        });
        onPaid && onPaid(res.order);
      } catch {
        onFailed && onFailed();
      }
    },
    modal: {
      ondismiss: () => {
        if (!finished) onDismiss && onDismiss();
      },
    },
  });

  rzp.on("payment.failed", async (resp) => {
    finished = true;
    try {
      await api.post(`/payments/${order._id}/failed`, {
        reason: resp.error ? resp.error.description : "",
        razorpayPaymentId: resp.error && resp.error.metadata ? resp.error.metadata.payment_id : "",
      });
    } catch {
      /* the failure page loads the real state anyway */
    }
    rzp.close();
    onFailed && onFailed();
  });

  rzp.open();
};