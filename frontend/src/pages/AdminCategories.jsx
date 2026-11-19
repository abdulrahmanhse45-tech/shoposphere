import React, { useState, useEffect } from "react";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import Modal from "../components/Modal";
import {
  Layers,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";

const emptyForm = { name: "", description: "" };

const AdminCategories = () => {
  // Data
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search & pagination (done by the backend)
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCategories, setTotalCategories] = useState(0);

  // Add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null means "adding"
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(activeSearch ? { search: activeSearch } : {}),
      });
      const res = await api.get(`/admin/categories?${queryParams.toString()}`);
      // If the last item on the last page was just deleted, step back a page.
      if (res.categories.length === 0 && page > 1) {
        setPage(Math.max(res.totalPages, 1));
        return;
      }
      setCategories(res.categories);
      setTotalPages(res.totalPages);
      setTotalCategories(res.total);
    } catch (err) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, limit, activeSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(search.trim());
  };

  const handleClearSearch = () => {
    setSearch("");
    setActiveSearch("");
    setPage(1);
  };

  // ---- Add / edit ----
  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (category) => {
    setEditingId(category._id);
    setForm({ name: category.name, description: category.description || "" });
    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const description = form.description.trim();

    // Quick checks for a friendly message; the backend checks everything again.
    if (name.length < 2 || name.length > 50) {
      setFormError("Category name must be between 2 and 50 characters.");
      return;
    }
    if (description.length > 300) {
      setFormError("Description must be at most 300 characters.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, { name, description });
      } else {
        await api.post("/admin/categories", { name, description });
        // New categories appear first (latest first), so go back to page 1.
        setPage(1);
      }
      closeForm();
      await fetchCategories();
    } catch (err) {
      // api.js already showed a toast; keep the form open and show it here too.
      setFormError(err.message || "Could not save the category.");
    } finally {
      setSaving(false);
    }
  };

  // ---- Soft delete ----
  const openDeleteModal = (category) => {
    setSelected(category);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/categories/${selected._id}`);
      setModalOpen(false);
      setSelected(null);
      await fetchCategories();
    } catch (err) {
      setError(err.message || "Failed to delete category.");
      setModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span className="badge badge-default">
              <Shield size={12} style={{ marginRight: "4px" }} />
              Catalog Console
            </span>
          </div>
          <h2 style={{ fontSize: "32px", color: "var(--color-espresso)" }}>Category Management</h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Create, rename and retire the categories that organise your collection.
          </p>
        </div>

        <AlertBanner type="error" message={error} onClose={() => setError("")} />

        {/* Toolbar: search + add */}
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
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", maxWidth: "500px" }}
          >
            <div style={{ position: "relative", flex: "1" }}>
              <input
                type="text"
                placeholder="Search categories by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "38px", height: "42px" }}
              />
              <Search size={16} color="#A8A29E" style={{ position: "absolute", left: "12px", top: "13px" }} />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ padding: "10px 18px", fontSize: "12px", height: "42px" }}
            >
              Search
            </button>

            {(search || activeSearch) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary"
                title="Reset search and view all categories"
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

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Per Page:</span>
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

            <button
              type="button"
              onClick={openAddForm}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 18px",
                fontSize: "12px",
                height: "42px",
              }}
            >
              <Plus size={14} /> Add Category
            </button>
          </div>
        </div>

        {/* Add / edit form */}
        {formOpen && (
          <form
            onSubmit={handleSave}
            className="luxury-card"
            style={{ padding: "24px", marginBottom: "24px" }}
          >
            <h3 style={{ fontSize: "18px", color: "var(--color-espresso)", marginBottom: "16px" }}>
              {editingId ? "Edit Category" : "New Category"}
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="category-name">
                Name
              </label>
              <input
                id="category-name"
                type="text"
                className="form-input"
                value={form.name}
                maxLength={50}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Leather Bags"
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label className="form-label" htmlFor="category-description">
                Description (optional)
              </label>
              <textarea
                id="category-description"
                className="form-input"
                rows={3}
                value={form.description}
                maxLength={300}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="A short note about this category"
              />
            </div>

            {formError && (
              <p style={{ color: "var(--color-danger)", fontSize: "13px", marginBottom: "12px" }}>
                {formError}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ padding: "10px 20px", fontSize: "12px" }}
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={closeForm}
                disabled={saving}
                style={{ padding: "10px 20px", fontSize: "12px" }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Categories table */}
        <div className="luxury-table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                    Loading categories...
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px" }}>
                    {activeSearch
                      ? "No categories match your search."
                      : "No categories yet. Use “Add Category” to create the first one."}
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Layers size={16} color="var(--color-espresso)" />
                        <div>
                          <p style={{ fontWeight: 600, margin: 0, color: "var(--color-text-main)" }}>
                            {c.name}
                          </p>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                            ID: {c._id.slice(-6)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-body)", maxWidth: "340px" }}>
                      {c.description || "—"}
                    </td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => openEditForm(c)}
                          className="btn-secondary"
                          style={{ padding: "6px 14px", fontSize: "11px", letterSpacing: "0.5px" }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(c)}
                          className="btn-danger"
                          style={{ padding: "6px 14px", fontSize: "11px", letterSpacing: "0.5px" }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCategories}{" "}
            categories)
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
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-espresso)", padding: "0 8px" }}>
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

        {/* Delete confirmation */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Category"
          message={`Are you sure you want to delete “${selected?.name}”? It will disappear from the shop and from product forms. Its products will no longer be shown to customers. The record itself is kept, not erased.`}
          confirmText="Delete Category"
          isDanger={true}
          isLoading={deleting}
        />
      </div>
    </div>
  );
};

export default AdminCategories;
