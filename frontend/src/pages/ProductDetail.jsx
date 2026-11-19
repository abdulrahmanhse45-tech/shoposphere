import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { imageUrl, formatPrice } from "../utils/imageUrl";

const MAX_PER_ITEM = 10; // same limit the backend enforces

const isLoggedIn = () => {
  try {
    return !!localStorage.getItem("shoposphere_token");
  } catch {
    return false;
  }
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null); // { product, stockStatus, related }
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  // Zoom: hovering (or tapping) the big image magnifies it around the cursor.
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState("50% 50%");

  // Load the product. If it is unpublished, deleted, sold out or its category
  // was deleted, the backend answers 404 and we go back to the listing
  // (api.js already shows the "no longer available" message).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setActiveImage(0);
    setQuantity(1);
    setZoomed(false);
    window.scrollTo(0, 0);

    api
      .get(`/products/${slug}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) navigate("/products", { replace: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug, navigate]);

  // Is this product already in the wishlist?
  useEffect(() => {
    if (!data || !isLoggedIn()) {
      setInWishlist(false);
      return;
    }
    api
      .get("/wishlist")
      .then((res) => setInWishlist(res.wishlist.productIds.includes(data.product._id)))
      .catch(() => {});
  }, [data]);

  if (loading || !data) {
    return <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>Loading...</div>;
  }

  const { product, stockStatus, related } = data;
  const images = product.images && product.images.length ? product.images : [""];
  const maxQuantity = Math.min(product.stock, MAX_PER_ITEM);
  const lowStock = product.stock <= 5;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin(`${x}% ${y}%`);
  };

  const addToCart = async () => {
    if (!isLoggedIn()) return navigate("/login");
    try {
      await api.post("/cart/items", { productId: product._id, quantity });
      setInWishlist(false); // the backend removes it from the wishlist
    } catch {
      /* api.js already showed the error message */
    }
  };

  const toggleWishlist = async () => {
    if (!isLoggedIn()) return navigate("/login");
    try {
      if (inWishlist) await api.delete(`/wishlist/items/${product._id}`);
      else await api.post("/wishlist/items", { productId: product._id });
      setInWishlist(!inWishlist);
    } catch {
      /* api.js already showed the error message */
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ fontSize: 14, marginBottom: 20, opacity: 0.85 }}>
        <Link to="/">Home</Link> {" / "}
        <Link to="/products">Shop</Link> {" / "}
        {product.category && (
          <>
            <Link to={`/products?category=${product.category._id}`}>{product.category.name}</Link>
            {" / "}
          </>
        )}
        <span>{product.name}</span>
      </nav>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
        {/* Gallery */}
        <div style={{ flex: "1 1 380px", maxWidth: 520 }}>
          <div
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={handleMouseMove}
            onClick={() => setZoomed((z) => !z)}
            style={{
              overflow: "hidden",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#f2f2f2",
              cursor: zoomed ? "zoom-out" : "zoom-in",
              aspectRatio: "1 / 1",
            }}
          >
            <img
              src={imageUrl(images[activeImage])}
              alt={product.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: zoomed ? "scale(2)" : "scale(1)",
                transformOrigin: zoomOrigin,
                transition: zoomed ? "transform 0.1s" : "transform 0.25s",
              }}
            />
          </div>

          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  style={{
                    padding: 0,
                    width: 70,
                    height: 70,
                    cursor: "pointer",
                    borderRadius: 6,
                    overflow: "hidden",
                    background: "none",
                    border: i === activeImage ? "2px solid #111" : "1px solid #ccc",
                  }}
                >
                  <img
                    src={imageUrl(img)}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ flex: "1 1 340px" }}>
          <h1 style={{ marginTop: 0 }}>{product.name}</h1>

          <div style={{ fontSize: 26, marginBottom: 4 }}>
            <strong>{formatPrice(product.finalPrice)}</strong>
            {product.discountPercentage > 0 && (
              <>
                {" "}
                <s style={{ fontSize: 18, opacity: 0.55 }}>{formatPrice(product.price)}</s>{" "}
                <span style={{ fontSize: 16, color: "green" }}>{product.discountPercentage}% off</span>
              </>
            )}
          </div>

          <p style={{ color: lowStock ? "#b45309" : "green", fontWeight: 600 }}>{stockStatus}</p>

          <p style={{ lineHeight: 1.6 }}>{product.description}</p>

          {product.highlights && product.highlights.length > 0 && (
            <div style={{ margin: "16px 0" }}>
              <h3 style={{ marginBottom: 6 }}>Highlights</h3>
              <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.7 }}>
                {product.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 20 }}>
            <label>
              Qty{" "}
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{ padding: 8 }}
              >
                {Array.from({ length: maxQuantity }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={addToCart} style={{ padding: "10px 22px", cursor: "pointer" }}>
              Add to cart
            </button>
            <button type="button" onClick={toggleWishlist} style={{ padding: "10px 16px", cursor: "pointer" }}>
              {inWishlist ? "♥ In wishlist" : "♡ Add to wishlist"}
            </button>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related && related.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <h2>Related products</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            {related.map((r) => (
              <Link
                key={r._id}
                to={`/products/${r.slug}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <img
                  src={imageUrl(r.images && r.images[0])}
                  alt={r.name}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "#f2f2f2" }}
                />
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div>
                    {formatPrice(r.price * (1 - (r.discountPercentage || 0) / 100))}
                    {r.discountPercentage > 0 && (
                      <span style={{ color: "green", fontSize: 13 }}> {r.discountPercentage}% off</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
