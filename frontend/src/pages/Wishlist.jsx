import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { imageUrl, formatPrice } from "../utils/imageUrl";

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/wishlist");
      setItems(res.wishlist.items);
    } catch {
      /* api.js already showed the error message */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (productId) => {
    setBusyId(productId);
    try {
      const res = await api.delete(`/wishlist/items/${productId}`);
      setItems(res.wishlist.items);
    } catch {
      load();
    } finally {
      setBusyId("");
    }
  };

  // The backend adds 1 to the cart (checking stock) and removes it from the wishlist.
  const moveToCart = async (productId) => {
    setBusyId(productId);
    try {
      const res = await api.post(`/wishlist/items/${productId}/move-to-cart`);
      setItems(res.wishlist.items);
    } catch {
      load();
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>Loading wishlist...</div>;
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <h1>Your wishlist</h1>
        <p>Your wishlist is empty.</p>
        <Link to="/products">Browse products</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Your wishlist</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
        }}
      >
        {items.map((p) => {
          const busy = busyId === p._id;
          return (
            <div
              key={p._id}
              style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", opacity: busy ? 0.5 : 1 }}
            >
              <Link to={`/products/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <img
                  src={imageUrl(p.image)}
                  alt={p.name}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "#f2f2f2" }}
                />
                <div style={{ padding: "10px 12px 0" }}>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div>
                    <strong>{formatPrice(p.finalPrice)}</strong>
                    {p.discountPercentage > 0 && (
                      <>
                        {" "}
                        <s style={{ opacity: 0.55 }}>{formatPrice(p.price)}</s>
                      </>
                    )}
                  </div>
                </div>
              </Link>
              <div style={{ display: "flex", gap: 8, padding: 12 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => moveToCart(p._id)}
                  style={{ flex: 1, padding: "8px 0", cursor: "pointer" }}
                >
                  Move to cart
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(p._id)}
                  style={{ padding: "8px 12px", cursor: "pointer" }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
