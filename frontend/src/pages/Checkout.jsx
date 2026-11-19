import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { imageUrl, formatPrice } from "../utils/imageUrl";
import { openRazorpay } from "../utils/razorpayCheckout";

const emptyForm = {
  fullName: "",
  phone: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  addressType: "Home",
};

const box = { border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 20 };
const input = { width: "100%", padding: 8, boxSizing: "border-box", marginBottom: 8 };

// Checkout does three jobs: pick an address, pick a payment method, place the order.
// Every amount shown here comes from the backend. This page never works out a total.
const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [method, setMethod] = useState("COD");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [problem, setProblem] = useState("");

  // address form (add or edit)
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // ONE random key for this purchase. If the request is sent twice (double
  // click, bad network), the backend sees the same key and makes one order.
  const keyRef = useRef(
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `k${Date.now()}${Math.random().toString(36).slice(2)}`
  );

  const loadAddresses = async (selectId) => {
    const res = await api.get("/addresses");
    // Your backend answers { success, count, data: [...] }
    const list = Array.isArray(res) ? res : res.data || [];
    setAddresses(list);
    const pick = selectId || addressId;
    if (pick && list.some((a) => a._id === pick)) {
      setAddressId(pick);
    } else {
      const def = list.find((a) => a.isDefault) || list[0];
      setAddressId(def ? def._id : "");
    }
  };

  useEffect(() => {
    const start = async () => {
      try {
        const res = await api.get("/orders/checkout-summary");
        setSummary(res);
        await loadAddresses();
      } catch (err) {
        // empty cart or unavailable items: send them back to the cart
        setProblem(err.message || "Could not prepare checkout");
      } finally {
        setLoading(false);
      }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openForm = (address) => {
    setFormError("");
    if (address) {
      setEditingId(address._id);
      setForm({ ...emptyForm, ...address });
    } else {
      setEditingId("");
      setForm({ ...emptyForm, fullName: user ? user.name || "" : "" });
    }
    setFormOpen(true);
  };

  const setField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const saveAddress = async (e) => {
    e.preventDefault();
    setFormError("");
    const f = form;
    if (!f.fullName.trim() || !f.streetAddress.trim() || !f.city.trim() || !f.state.trim()) {
      return setFormError("Please fill in all the fields");
    }
    if (!/^\d{10}$/.test(String(f.phone).trim())) return setFormError("Phone must be 10 digits");
    if (!/^\d{6}$/.test(String(f.postalCode).trim())) return setFormError("PIN code must be 6 digits");

    setSaving(true);
    try {
      const body = {
        fullName: f.fullName.trim(),
        phone: String(f.phone).trim(),
        streetAddress: f.streetAddress.trim(),
        city: f.city.trim(),
        state: f.state.trim(),
        postalCode: String(f.postalCode).trim(),
        country: f.country || "India",
        addressType: f.addressType,
      };
      const res = editingId ? await api.put(`/addresses/${editingId}`, body) : await api.post("/addresses", body);
      const saved = res && res.data; // the saved address
      setFormOpen(false);
      await loadAddresses(saved && saved._id ? saved._id : editingId);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const goFailed = (id) => navigate(`/order-failed/${id}`, { replace: true });
  const goSuccess = (id) => navigate(`/order-success/${id}`, { replace: true });

  const placeOrder = async () => {
    if (!addressId) return setProblem("Please choose or add a delivery address");
    setProblem("");
    setPlacing(true);
    try {
      const res = await api.post("/orders", {
        addressId,
        paymentMethod: method,
        idempotencyKey: keyRef.current,
      });
      const order = res.order;

      if (method === "COD") return goSuccess(order._id);

      // Online payment
      if (res.duplicate && order.paymentStatus === "paid") return goSuccess(order._id);
      if (!res.payment) return goFailed(order._id); // order exists, payment can be retried

      await openRazorpay({
        order,
        payment: res.payment,
        user,
        onPaid: () => goSuccess(order._id),
        onFailed: () => goFailed(order._id),
        onDismiss: () => goFailed(order._id),
      });
    } catch (err) {
      setProblem(err.message);
      if (err.data && err.data.issues) setProblem("Some items are no longer available. Please check your cart.");
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>Loading checkout...</div>;

  if (!summary) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1>Checkout</h1>
        <p style={{ color: "crimson" }}>{problem}</p>
        <Link to="/cart">Back to cart</Link>
      </div>
    );
  }

  const { pricing } = summary;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Checkout</h1>

      {/* 1. Address */}
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>1. Delivery address</h2>
        {addresses.length === 0 && !formOpen && <p>You have no saved address yet.</p>}

        {addresses.map((a) => (
          <label
            key={a._id}
            style={{
              display: "flex",
              gap: 10,
              padding: 10,
              marginBottom: 8,
              border: `1px solid ${addressId === a._id ? "#000" : "#ddd"}`,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            <input type="radio" name="address" checked={addressId === a._id} onChange={() => setAddressId(a._id)} />
            <span style={{ flex: 1 }}>
              <strong>{a.fullName}</strong> ({a.addressType}) {a.isDefault && <em>- default</em>}
              <br />
              {a.streetAddress}, {a.city}, {a.state} {a.postalCode}
              <br />
              Phone: {a.phone}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                openForm(a);
              }}
            >
              Edit
            </button>
          </label>
        ))}

        {!formOpen && (
          <button type="button" onClick={() => openForm(null)}>
            + Add a new address
          </button>
        )}

        {formOpen && (
          <form onSubmit={saveAddress} style={{ marginTop: 12 }}>
            <h3>{editingId ? "Edit address" : "New address"}</h3>
            <input style={input} name="fullName" placeholder="Full name" value={form.fullName} onChange={setField} />
            <input style={input} name="phone" placeholder="Phone (10 digits)" value={form.phone} onChange={setField} maxLength={10} />
            <input style={input} name="streetAddress" placeholder="Street address" value={form.streetAddress} onChange={setField} />
            <input style={input} name="city" placeholder="City" value={form.city} onChange={setField} />
            <input style={input} name="state" placeholder="State" value={form.state} onChange={setField} />
            <input style={input} name="postalCode" placeholder="PIN code (6 digits)" value={form.postalCode} onChange={setField} maxLength={6} />
            <select style={input} name="addressType" value={form.addressType} onChange={setField}>
              <option>Home</option>
              <option>Work</option>
              <option>Other</option>
            </select>
            {formError && <p style={{ color: "crimson" }}>{formError}</p>}
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save address"}
            </button>{" "}
            <button type="button" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* 2. Items and totals */}
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>2. Your items</h2>
        {summary.items.map((item) => (
          <div key={item.productId} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <img src={imageUrl(item.product.image)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 4, background: "#f2f2f2" }} />
            <div style={{ flex: 1 }}>
              {item.product.name}
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                {formatPrice(item.product.finalPrice)} x {item.quantity}
              </div>
            </div>
            <strong>{formatPrice(item.lineTotal)}</strong>
          </div>
        ))}

        <div style={{ marginTop: 12, textAlign: "right", lineHeight: 1.8 }}>
          <div>Subtotal: {formatPrice(pricing.subtotal)}</div>
          <div>Shipping: {pricing.shippingCharge === 0 ? "Free" : formatPrice(pricing.shippingCharge)}</div>
          <div>Tax (18% GST): {formatPrice(pricing.tax)}</div>
          <div style={{ fontSize: 22 }}>
            Total: <strong>{formatPrice(pricing.total)}</strong>
          </div>
        </div>
      </div>

      {/* 3. Payment */}
      <div style={box}>
        <h2 style={{ marginTop: 0 }}>3. Payment method</h2>
        <label style={{ display: "block", marginBottom: 8, cursor: "pointer" }}>
          <input type="radio" name="method" checked={method === "COD"} onChange={() => setMethod("COD")} /> Cash on Delivery
        </label>
        <label style={{ display: "block", cursor: "pointer" }}>
          <input type="radio" name="method" checked={method === "RAZORPAY"} onChange={() => setMethod("RAZORPAY")} /> Pay online (Razorpay: UPI, cards, netbanking)
        </label>
      </div>

      {problem && <p style={{ color: "crimson" }}>{problem}</p>}

      <div style={{ textAlign: "right" }}>
        <Link to="/cart" style={{ marginRight: 16 }}>
          Back to cart
        </Link>
        <button type="button" onClick={placeOrder} disabled={placing} style={{ padding: "12px 28px", cursor: placing ? "wait" : "pointer" }}>
          {placing ? "Please wait..." : method === "COD" ? "Place order" : `Pay ${formatPrice(pricing.total)}`}
        </button>
      </div>
    </div>
  );
};

export default Checkout;
