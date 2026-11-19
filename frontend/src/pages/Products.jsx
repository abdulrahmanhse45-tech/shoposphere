import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { imageUrl, formatPrice } from "../utils/imageUrl";

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name_asc", label: "Name: A to Z" },
  { value: "name_desc", label: "Name: Z to A" },
];

const isLoggedIn = () => {
  try {
    return !!localStorage.getItem("shoposphere_token");
  } catch {
    return false;
  }
};

const Products = () => {
  const navigate = useNavigate();
  // The URL holds the search/filter/sort/page, so refresh and the back button
  // keep working, and a filtered view can be shared as a link.
  const [params, setParams] = useSearchParams();

  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";
  const sort = params.get("sort") || "newest";
  const page = Math.max(parseInt(params.get("page")) || 1, 1);

  // Text boxes are edited locally and only applied when the form is submitted.
  const [searchText, setSearchText] = useState(search);
  const [minText, setMinText] = useState(minPrice);
  const [maxText, setMaxText] = useState(maxPrice);

  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ products: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const requestId = useRef(0);

  // Change some params and go back to page 1 (unless the page itself changed).
  const updateParams = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    });
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  // Load the category dropdown once.
  useEffect(() => {
    api
      .get("/products/categories")
      .then((res) => setCategories(res.categories || []))
      .catch(() => {});
  }, []);

  // Load which products are already in the wishlist (only if logged in).
  useEffect(() => {
    if (!isLoggedIn()) return;
    api
      .get("/wishlist")
      .then((res) => setWishlistIds(new Set(res.wishlist.productIds)))
      .catch(() => {});
  }, []);

  // Load products whenever the URL filters change.
  const queryString = params.toString();
  useEffect(() => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setError("");

    const query = new URLSearchParams(queryString);
    query.set("limit", "12");

    api
      .get(`/products?${query.toString()}`)
      .then((res) => {
        if (thisRequest !== requestId.current) return; // a newer request replaced this one
        setData(res);
      })
      .catch((err) => {
        if (thisRequest !== requestId.current) return;
        setError(err.message || "Could not load products");
      })
      .finally(() => {
        if (thisRequest === requestId.current) setLoading(false);
      });
  }, [queryString]);

  // Keep the text boxes in step when the URL changes (e.g. back button, clear).
  useEffect(() => {
    setSearchText(search);
    setMinText(minPrice);
    setMaxText(maxPrice);
  }, [search, minPrice, maxPrice]);

  const applyFilters = (e) => {
    e.preventDefault();
    updateParams({
      search: searchText.trim(),
      minPrice: minText.trim(),
      maxPrice: maxText.trim(),
    });
  };

  const clearSearch = () => {
    setSearchText("");
    updateParams({ search: "" });
  };

  const resetAll = () => {
    setSearchText("");
    setMinText("");
    setMaxText("");
    setParams(new URLSearchParams());
  };

  const toggleWishlist = async (productId) => {
    if (!isLoggedIn()) return navigate("/login");
    try {
      const res = wishlistIds.has(productId)
        ? await api.delete(`/wishlist/items/${productId}`)
        : await api.post("/wishlist/items", { productId });
      setWishlistIds(new Set(res.wishlist.productIds));
    } catch {
      /* api.js already showed the error message */
    }
  };

  const addToCart = async (productId) => {
    if (!isLoggedIn()) return navigate("/login");
    try {
      await api.post("/cart/items", { productId, quantity: 1 });
      // The backend removes it from the wishlist, so mirror that here.
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } catch {
      /* api.js already showed the error message */
    }
  };

  const hasFilters = search || category || minPrice || maxPrice || sort !== "newest";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginBottom: 16 }}>Shop</h1>

      {/* Search + price filter */}
      <form
        onSubmit={applyFilters}
        style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}
      >
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: "100%", padding: "8px 32px 8px 10px", boxSizing: "border-box" }}
          />
          {searchText && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          )}
        </div>
        <input
          type="number"
          min="0"
          placeholder="Min ₹"
          value={minText}
          onChange={(e) => setMinText(e.target.value)}
          style={{ width: 100, padding: 8 }}
        />
        <input
          type="number"
          min="0"
          placeholder="Max ₹"
          value={maxText}
          onChange={(e) => setMaxText(e.target.value)}
          style={{ width: 100, padding: 8 }}
        />
        <button type="submit" style={{ padding: "8px 16px", cursor: "pointer" }}>
          Apply
        </button>
      </form>

      {/* Category + sort */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        <select
          value={category}
          onChange={(e) => updateParams({ category: e.target.value })}
          style={{ padding: 8 }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => updateParams({ sort: e.target.value === "newest" ? "" : e.target.value })}
          style={{ padding: 8 }}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" onClick={resetAll} style={{ padding: "8px 12px", cursor: "pointer" }}>
            Reset all
          </button>
        )}
        <span style={{ marginLeft: "auto", alignSelf: "center", opacity: 0.7 }}>
          {loading ? "Loading..." : `${data.total} product${data.total === 1 ? "" : "s"}`}
        </span>
      </div>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {!loading && !error && data.products.length === 0 && (
        <p>No products match your search. Try changing or resetting the filters.</p>
      )}

      {/* Product grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
          gap: 20,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {data.products.map((p) => {
          const inWishlist = wishlistIds.has(p._id);
          return (
            <div
              key={p._id}
              style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden", position: "relative" }}
            >
              <button
                type="button"
                onClick={() => toggleWishlist(p._id)}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 1,
                  border: "none",
                  borderRadius: "50%",
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                  fontSize: 18,
                  background: "rgba(255,255,255,0.9)",
                  color: inWishlist ? "crimson" : "#555",
                }}
              >
                {inWishlist ? "♥" : "♡"}
              </button>

              <Link to={`/products/${p.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                <img
                  src={imageUrl(p.images && p.images[0])}
                  alt={p.name}
                  style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "#f2f2f2" }}
                />
                <div style={{ padding: "10px 12px 0" }}>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{p.category && p.category.name}</div>
                  <div style={{ fontWeight: 600, margin: "2px 0 6px" }}>{p.name}</div>
                  <div>
                    <strong>{formatPrice(p.finalPrice)}</strong>
                    {p.discountPercentage > 0 && (
                      <>
                        {" "}
                        <s style={{ opacity: 0.55 }}>{formatPrice(p.price)}</s>{" "}
                        <span style={{ color: "green", fontSize: 13 }}>{p.discountPercentage}% off</span>
                      </>
                    )}
                  </div>
                  {p.stock <= 5 && (
                    <div style={{ color: "#b45309", fontSize: 13 }}>Only {p.stock} left</div>
                  )}
                </div>
              </Link>

              <div style={{ padding: 12 }}>
                <button
                  type="button"
                  onClick={() => addToCart(p._id)}
                  style={{ width: "100%", padding: "8px 0", cursor: "pointer" }}
                >
                  Add to cart
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 28 }}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => updateParams({ page: String(page - 1) })}
            style={{ padding: "8px 14px", cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          <span>
            Page {page} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= data.totalPages || loading}
            onClick={() => updateParams({ page: String(page + 1) })}
            style={{ padding: "8px 14px", cursor: page >= data.totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Products;
