import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatPrice } from "../utils/imageUrl";
import { STATUS_LABELS, PAYMENT_LABELS, RETURN_LABELS, formatDate, statusColor } from "../utils/orderUi";

const Orders = () => {
  const [data, setData] = useState({ orders: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 10 });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    api
      .get(`/orders?${params.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, search, status]);

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchText.trim());
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
      <h1>My orders</h1>

      <form onSubmit={submitSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by order number or product"
          style={{ flex: "1 1 220px", padding: 8 }}
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          style={{ padding: 8 }}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button type="submit">Search</button>
      </form>

      {loading && <p>Loading...</p>}
      {!loading && data.orders.length === 0 && (
        <p>
          No orders found. <Link to="/products">Start shopping</Link>
        </p>
      )}

      {data.orders.map((o) => (
        <Link
          key={o._id}
          to={`/orders/${o._id}`}
          style={{ display: "block", border: "1px solid #ddd", borderRadius: 8, padding: 14, marginBottom: 12, color: "inherit" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <strong>{o.orderNumber}</strong>
            <span style={{ color: statusColor(o.status), fontWeight: 600 }}>{STATUS_LABELS[o.status]}</span>
          </div>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 4 }}>
            {formatDate(o.createdAt)} · {o.items.length} item{o.items.length === 1 ? "" : "s"} ·{" "}
            {o.items.map((i) => i.name).join(", ").slice(0, 80)}
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>{formatPrice(o.pricing.total)}</strong> · {PAYMENT_LABELS[o.paymentStatus]}
            {o.returnRequest && o.returnRequest.status !== "none" && <> · {RETURN_LABELS[o.returnRequest.status]}</>}
          </div>
        </Link>
      ))}

      {data.totalPages > 1 && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.totalPages}
          </span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders;
