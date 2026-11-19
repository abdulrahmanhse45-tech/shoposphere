import React, { useState, useEffect } from "react";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import Modal from "../components/Modal";
import {
  Users,
  Search,
  X,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldAlert,
  Calendar,
  RotateCcw,
} from "lucide-react";

const AdminUsers = () => {
  // Data states
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, blockedUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Pagination & Filtering
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Block/Unblock Confirmation Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProcessingBlock, setIsProcessingBlock] = useState(false);

  // Fetch Users with search, pagination, sorting
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(activeSearch ? { search: activeSearch } : {}),
      });

      const res = await api.get(`/admin/users?${queryParams.toString()}`);
      if (res.success) {
        setUsers(res.users);
        setTotalUsers(res.totalUsers);
        setTotalPages(res.totalPages);
        setPage(res.currentPage);
      }
    } catch (err) {
      setError(err.message || "Failed to load user management registry.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary stats
  const fetchStats = async () => {
    try {
      const res = await api.get("/admin/stats");
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [page, limit, activeSearch]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search.trim());
  };

  // Dedicated "Clear" Search Button
  const handleClearSearch = () => {
    setSearch("");
    setActiveSearch("");
    setPage(1);
  };

  // Block/Unblock Modal Trigger
  const openBlockModal = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleConfirmToggleBlock = async () => {
    if (!selectedUser) return;

    try {
      setIsProcessingBlock(true);
      const res = await api.patch(`/admin/users/${selectedUser._id}/block`);
      setSuccessMsg(res.message);
      setModalOpen(false);
      setSelectedUser(null);
      await fetchUsers();
      await fetchStats();
    } catch (err) {
      setError(err.message || "Failed to update user block status.");
    } finally {
      setIsProcessingBlock(false);
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        {/* Header and Brand Bar */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-default">
              <Shield size={12} style={{ marginRight: "4px" }} />
              Security Console
            </span>
          </div>
          <h2 style={{ fontSize: "32px", color: "var(--color-espresso)" }}>
            User Management Directory
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Review registered clientele, query records, and administer account privileges.
          </p>
        </div>

        {/* Real-time KPI Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div className="luxury-card" style={{ padding: "20px" }}>
            <span className="form-label" style={{ marginBottom: "4px" }}>
              Total Registered Clients
            </span>
            <p style={{ fontSize: "28px", fontWeight: 600, color: "var(--color-espresso)", margin: 0 }}>
              {stats.totalUsers}
            </p>
          </div>

          <div className="luxury-card" style={{ padding: "20px" }}>
            <span className="form-label" style={{ marginBottom: "4px" }}>
              Active Clientele
            </span>
            <p style={{ fontSize: "28px", fontWeight: 600, color: "var(--color-success)", margin: 0 }}>
              {stats.activeUsers}
            </p>
          </div>

          <div className="luxury-card" style={{ padding: "20px" }}>
            <span className="form-label" style={{ marginBottom: "4px" }}>
              Blocked Accounts
            </span>
            <p style={{ fontSize: "28px", fontWeight: 600, color: "var(--color-danger)", margin: 0 }}>
              {stats.blockedUsers}
            </p>
          </div>
        </div>

        <AlertBanner type="error" message={error} onClose={() => setError("")} />
        <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

        {/* Search & Filter Toolbar with Dedicated "Clear" Button */}
        <div
          className="luxury-card"
          style={{
            padding: "20px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          {/* Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flex: "1",
              maxWidth: "500px",
            }}
          >
            <div style={{ position: "relative", flex: "1" }}>
              <input
                type="text"
                placeholder="Search clientele by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "38px", height: "42px" }}
              />
              <Search
                size={16}
                color="#A8A29E"
                style={{ position: "absolute", left: "12px", top: "13px" }}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "10px 18px", fontSize: "12px", height: "42px" }}
            >
              Search
            </button>

            {/* Dedicated Clear Button Requirements */}
            {(search || activeSearch) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary"
                title="Reset search and view all users"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  height: "42px",
                }}
              >
                <X size={14} /> Clear
              </button>
            )}
          </form>

          {/* Rows per page selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              Per Page:
            </span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="form-input"
              style={{ width: "70px", padding: "8px" }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>

        {/* Registered Users Data Table */}
        <div className="luxury-table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Registered Date</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    {/* Client Name & Avatar */}
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              backgroundColor: "var(--color-espresso)",
                              color: "#FFFFFF",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 600,
                              fontSize: "13px",
                            }}
                          >
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p style={{ fontWeight: 600, margin: 0, color: "var(--color-text-main)" }}>
                            {u.name}
                          </p>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            ID: {u._id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ color: "var(--color-text-body)" }}>{u.email}</td>

                    {/* Phone */}
                    <td style={{ color: "var(--color-text-muted)" }}>{u.phone || "—"}</td>

                    {/* Role */}
                    <td>
                      <span className="badge badge-role">
                        {u.role === "admin" ? "Admin" : "Customer"}
                      </span>
                    </td>

                    {/* Registered Date (Sorted latest first) */}
                    <td style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Status Badge */}
                    <td>
                      {u.isBlocked ? (
                        <span className="badge badge-blocked">
                          <UserX size={11} style={{ marginRight: "3px" }} />
                          Blocked
                        </span>
                      ) : (
                        <span className="badge badge-active">
                          <UserCheck size={11} style={{ marginRight: "3px" }} />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Action: Block / Unblock */}
                    <td style={{ textAlign: "right" }}>
                      {u.role !== "admin" ? (
                        <button
                          type="button"
                          onClick={() => openBlockModal(u)}
                          className={u.isBlocked ? "btn-secondary" : "btn-danger"}
                          style={{
                            padding: "6px 14px",
                            fontSize: "11px",
                            letterSpacing: "0.5px",
                          }}
                        >
                          {u.isBlocked ? (
                            <>
                              <UserCheck size={13} /> Unblock
                            </>
                          ) : (
                            <>
                              <UserX size={13} /> Block
                            </>
                          )}
                        </button>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--color-text-light)" }}>
                          Admin
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "24px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> (
            {totalUsers} registered clientele)
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              <ChevronLeft size={14} /> Previous
            </button>

            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-espresso)",
                padding: "0 8px",
              }}
            >
              {page}
            </span>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* BLOCK / UNBLOCK CONFIRMATION MODAL */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmToggleBlock}
          title={selectedUser?.isBlocked ? "Unblock Client Account" : "Confirm Account Suspension (Block)"}
          message={
            selectedUser?.isBlocked
              ? `Are you sure you want to unblock ${selectedUser?.name} (${selectedUser?.email})? They will immediately regain access to their account and shopping services.`
              : `Are you sure you want to block ${selectedUser?.name} (${selectedUser?.email})? If they are currently logged in, all protected customer access will be immediately terminated with a 403 Forbidden.`
          }
          confirmText={selectedUser?.isBlocked ? "Unblock User" : "Block User"}
          isDanger={!selectedUser?.isBlocked}
          isLoading={isProcessingBlock}
        />
      </div>
    </div>
  );
};

export default AdminUsers;
