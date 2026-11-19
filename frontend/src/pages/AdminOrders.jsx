import { useEffect, useState } from "react";
import api from "../services/api";
import { formatPrice } from "../utils/imageUrl";
import { STATUS_LABELS, PAYMENT_LABELS, RETURN_LABELS, formatDate, statusColor } from "../utils/orderUi";

const th = { textAlign: "left", padding: "8px 6px", borderBottom: "2px solid #ccc", fontSize: 13 };
const td = { padding: "8px 6px", borderBottom: "1px solid #eee", fontSize: 14, verticalAlign: "top" };

const AdminOrders = () => {
  const [data, setData] = useState({ orders: [], page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [returnStatus, setReturnStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  const [selected, setSelected] = useState(null); // full order for the detail panel
  const [allowed, setAllowed] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 10, sort });
    if (search) p.set("search", search);
    if (status) p.set("status", status);
    if (paymentStatus) p.set("paymentStatus", paymentStatus);
    if (returnStatus) p.set("returnStatus", returnStatus);
    api
      .get(`/admin/orders?${p.toString()}`)
      .then((res) => !cancelled && setData(res))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, search, status, paymentStatus, returnStatus, sort, reload]);

  const filterChange = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  const openOrder = async (id) => {
    try {
      const res = await api.get(`/admin/orders/${id}`);
      setSelected(res.order);
      setAllowed(res.allowedNextStatuses);
      setNote("");
    } catch {
      /* message shown by api.js */
    }
  };

  const changeStatus = async (next) => {
    setBusy(true);
    try {
      await api.patch(`/admin/orders/${selected._id}/status`, { status: next, reason: next === "cancelled" ? note : undefined });
      await openOrder(selected._id);
      setReload((n) => n + 1);
    } catch {
      openOrder(selected._id);
    } finally {
      setBusy(false);
    }
  };

  const reviewReturn = async (action) => {
    setBusy(true);
    try {
      await api.patch(`/admin/orders/${selected._id}/return`, { action, note });
      await openOrder(selected._id);
      setReload((n) => n + 1);
    } catch {
      openOrder(selected._id);
    } finally {
      setBusy(false);
    }
  };

  const o = selected;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <h1>Orders</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchText.trim());
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Order number, customer name or email"
          style={{ flex: "1 1 240px", padding: 8 }}
        />
        <select value={status} onChange={filterChange(setStatus)} style={{ padding: 8 }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={paymentStatus} onChange={filterChange(setPaymentStatus)} style={{ padding: 8 }}>
          <option value="">Any payment</option>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select value={returnStatus} onChange={filterChange(setReturnStatus)} style={{ padding: 8 }}>
          <option value="">Any return</option>
          <option value="requested">Return requested</option>
          <option value="approved">Return approved</option>
          <option value="rejected">Return rejected</option>
        </select>
        <select value={sort} onChange={filterChange(setSort)} style={{ padding: 8 }}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="total_desc">Total: high to low</option>
          <option value="total_asc">Total: low to high</option>
        </select>
        <button type="submit">Search</button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Order</th>
              <th style={th}>Date</th>
              <th style={th}>Customer</th>
              <th style={th}>Total</th>
              <th style={th}>Status</th>
              <th style={th}>Payment</th>
              <th style={th}>Return</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={td} colSpan={8}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && data.orders.length === 0 && (
              <tr>
                <td style={td} colSpan={8}>
                  No orders found.
                </td>
              </tr>
            )}
            {data.orders.map((row) => (
              <tr key={row._id}>
                <td style={td}>
                  <strong>{row.orderNumber}</strong>
                </td>
                <td style={td}>{formatDate(row.createdAt)}</td>
                <td style={td}>
                  {row.user ? row.user.name : "Deleted user"}
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{row.user && row.user.email}</div>
                </td>
                <td style={td}>{formatPrice(row.pricing.total)}</td>
                <td style={{ ...td, color: statusColor(row.status), fontWeight: 600 }}>{STATUS_LABELS[row.status]}</td>
                <td style={td}>
                  {row.paymentMethod === "COD" ? "COD" : "Online"}
                  <div style={{ fontSize: 12 }}>{PAYMENT_LABELS[row.paymentStatus]}</div>
                </td>
                <td style={td}>{RETURN_LABELS[row.returnRequest ? row.returnRequest.status : "none"]}</td>
                <td style={td}>
                  <button type="button" onClick={() => openOrder(row._id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPages > 1 && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {data.page} of {data.totalPages} ({data.total} orders)
          </span>
          <button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}

      {/* Detail panel */}
      {o && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
            padding: 24,
            zIndex: 1000,
          }}
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", color: "#222", borderRadius: 8, padding: 20, width: "100%", maxWidth: 760 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>{o.orderNumber}</h2>
              <button type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <p>
              <strong style={{ color: statusColor(o.status) }}>{STATUS_LABELS[o.status]}</strong> ·{" "}
              {o.paymentMethod === "COD" ? "Cash on Delivery" : "Online (Razorpay)"} - {PAYMENT_LABELS[o.paymentStatus]}
              <br />
              Customer: {o.user ? `${o.user.name} (${o.user.email})` : "Deleted user"}
            </p>

            <h4>Items</h4>
            {o.items.map((i, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "3px 0" }}>
                <span>
                  {i.name} x {i.quantity}
                </span>
                <span>{formatPrice(i.lineTotal)}</span>
              </div>
            ))}
            <div style={{ textAlign: "right", marginTop: 8 }}>
              Shipping {formatPrice(o.pricing.shippingCharge)} · Tax {formatPrice(o.pricing.tax)} ·{" "}
              <strong>Total {formatPrice(o.pricing.total)}</strong>
            </div>

            <h4>Delivery address</h4>
            <div style={{ fontSize: 14 }}>
              {o.shippingAddress.fullName}, {o.shippingAddress.streetAddress}, {o.shippingAddress.city},{" "}
              {o.shippingAddress.state} {o.shippingAddress.postalCode} · {o.shippingAddress.phone}
            </div>

            {o.returnRequest && o.returnRequest.status !== "none" && (
              <>
                <h4>Return</h4>
                <div style={{ fontSize: 14 }}>
                  {RETURN_LABELS[o.returnRequest.status]}: {o.returnRequest.reason}
                </div>
              </>
            )}

            <h4>Update</h4>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (used for cancel reason or return decision)"
              maxLength={300}
              style={{ width: "100%", boxSizing: "border-box", padding: 8, marginBottom: 8 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {allowed.length === 0 && <em>No further status changes are possible.</em>}
              {allowed.map((s) => (
                <button key={s} type="button" disabled={busy} onClick={() => changeStatus(s)}>
                  Mark {STATUS_LABELS[s]}
                </button>
              ))}
              {o.returnRequest && o.returnRequest.status === "requested" && (
                <>
                  <button type="button" disabled={busy} onClick={() => reviewReturn("approve")}>
                    Approve return
                  </button>
                  <button type="button" disabled={busy} onClick={() => reviewReturn("reject")}>
                    Reject return
                  </button>
                </>
              )}
            </div>

            <h4>Status history</h4>
            {(o.statusHistory || []).map((h, idx) => (
              <div key={idx} style={{ fontSize: 13, padding: "2px 0" }}>
                {formatDate(h.at)} · <strong>{STATUS_LABELS[h.status] || h.status.replace(/_/g, " ")}</strong> · by {h.by}
                {h.note ? ` · ${h.note}` : ""}
              </div>
            ))}

            <h4>Payment history</h4>
            {(o.paymentEvents || []).length === 0 && <div style={{ fontSize: 13 }}>No payment events.</div>}
            {(o.paymentEvents || []).map((e, idx) => (
              <div key={idx} style={{ fontSize: 13, padding: "2px 0" }}>
                {formatDate(e.at)} · {e.event.replace(/_/g, " ")}
                {e.razorpayPaymentId ? ` · ${e.razorpayPaymentId}` : ""}
                {e.note ? ` · ${e.note}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
