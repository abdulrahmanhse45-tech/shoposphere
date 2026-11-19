import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { imageUrl, formatPrice } from "../utils/imageUrl";

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(""); // product currently being changed
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutIssues, setCheckoutIssues] = useState([]);

  const loadCart = async () => {
    try {
      const res = await api.get("/cart");
      setCart(res.cart);
    } catch {
      /* api.js already showed the error message */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  // Every change goes to the backend, which re-checks stock and returns the
  // fresh cart. The page never calculates a price or total itself.
  const changeQuantity = async (productId, newQuantity) => {
    setBusyId(productId);
    try {
      const res = await api.patch(`/cart/items/${productId}`, { quantity: newQuantity });
      setCart(res.cart);
      setCheckoutIssues([]);
    } catch {
      loadCart(); // refresh so the screen matches the real stock
    } finally {
      setBusyId("");
    }
  };

  const removeItem = async (productId) => {
    setBusyId(productId);
    try {
      const res = await api.delete(`/cart/items/${productId}`);
      setCart(res.cart);
      setCheckoutIssues([]);
    } catch {
      loadCart();
    } finally {
      setBusyId("");
    }
  };

  // The backend re-checks price, stock and availability right now.
  const checkout = async () => {
    setCheckingOut(true);
    setCheckoutIssues([]);
    try {
      const res = await api.post("/cart/checkout-validation");
      setCart(res.cart);
      navigate("/checkout"); // the cart passed the check, go and pay
    } catch (err) {
      if (err.data && err.data.cart) setCart(err.data.cart);
      setCheckoutIssues((err.data && err.data.issues) || []);
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>Loading cart...</div>;
  }

  const items = cart ? cart.items : [];

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        <h1>Your cart</h1>
        <p>Your cart is empty.</p>
        <Link to="/products">Continue shopping</Link>
      </div>
    );
  }

  const hasInvalid = items.some((i) => !i.valid);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Your cart</h1>

      {hasInvalid && (
        <p style={{ color: "crimson", border: "1px solid crimson", padding: 10, borderRadius: 6 }}>
          Some items are unavailable or exceed the available stock. Fix or remove them to continue.
        </p>
      )}

      {items.map((item) => {
        const p = item.product;
        const busy = busyId === item.productId;
        return (
          <div
            key={item.productId}
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
              padding: "14px 0",
              borderBottom: "1px solid #ddd",
              opacity: busy ? 0.5 : 1,
              background: item.valid ? "transparent" : "rgba(220,20,60,0.06)",
            }}
          >
            <img
              src={imageUrl(p && p.image)}
              alt={p ? p.name : "Unavailable product"}
              style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, background: "#f2f2f2" }}
            />

            <div style={{ flex: "1 1 200px" }}>
              {p ? (
                <Link to={`/products/${p.slug}`} style={{ fontWeight: 600 }}>
                  {p.name}
                </Link>
              ) : (
                <strong>Unavailable product</strong>
              )}
              {p && (
                <div>
                  {formatPrice(p.finalPrice)}
                  {p.discountPercentage > 0 && (
                    <>
                      {" "}
                      <s style={{ opacity: 0.55 }}>{formatPrice(p.price)}</s>
                    </>
                  )}
                </div>
              )}
              {!item.valid && <div style={{ color: "crimson", fontSize: 14 }}>{item.issue}</div>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                disabled={busy || item.quantity <= 1}
                onClick={() => changeQuantity(item.productId, item.quantity - 1)}
                aria-label="Decrease quantity"
                style={{ width: 32, height: 32, cursor: "pointer" }}
              >
                −
              </button>
              <span style={{ minWidth: 24, textAlign: "center" }}>{item.quantity}</span>
              <button
                type="button"
                disabled={
                  busy ||
                  !p ||
                  item.quantity >= cart.maxPerItem ||
                  item.quantity >= p.stock
                }
                onClick={() => changeQuantity(item.productId, item.quantity + 1)}
                aria-label="Increase quantity"
                style={{ width: 32, height: 32, cursor: "pointer" }}
              >
                +
              </button>
            </div>

            <div style={{ width: 110, textAlign: "right" }}>
              <strong>{item.valid ? formatPrice(item.lineTotal) : "—"}</strong>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => removeItem(item.productId)}
              style={{ cursor: "pointer" }}
            >
              Remove
            </button>
          </div>
        );
      })}

      {checkoutIssues.length > 0 && (
        <div style={{ marginTop: 16, color: "crimson" }}>
          <strong>Checkout stopped:</strong>
          <ul>
            {checkoutIssues.map((i) => (
              <li key={i.productId}>
                {i.name || "A product"}: {i.issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "right" }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          {cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}
        </div>
        <div style={{ fontSize: 24, marginBottom: 12 }}>
          Total: <strong>{formatPrice(cart.total)}</strong>
        </div>
        <button
          type="button"
          onClick={checkout}
          disabled={!cart.canCheckout || checkingOut}
          title={cart.canCheckout ? "" : "Fix the unavailable items to continue"}
          style={{
            padding: "12px 28px",
            cursor: cart.canCheckout && !checkingOut ? "pointer" : "not-allowed",
          }}
        >
          {checkingOut ? "Checking..." : "Proceed to checkout"}
        </button>
        <div style={{ marginTop: 10 }}>
          <Link to="/products">Continue shopping</Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;
