import React, { useState, useEffect } from "react";
import Cropper from "react-easy-crop";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import Modal from "../components/Modal";
import { imageUrl, formatPrice } from "../utils/imageUrl";
import { getCroppedBlob } from "../utils/cropImage";
import {
  Package,
  Search,
  X,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Shield,
  Upload,
} from "lucide-react";

const MAX_IMAGES = 8;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL_MB = 10;

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discountPercentage: "0",
  stock: "",
  category: "",
  highlightsText: "",
  isPublished: false,
};

let imageKeyCounter = 0;
const nextKey = () => `img-${++imageKeyCounter}`;

const AdminProducts = () => {
  // ---- List data ----
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]); // for dropdowns
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- Search, filters, pagination (all done by the backend) ----
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ---- Add / edit form ----
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Images in the form, in order. Each is either
  //   { key, existing: "/uploads/..." or "https://..." }   (already saved), or
  //   { key, blob, preview }                              (cropped, not uploaded yet)
  const [images, setImages] = useState([]);

  // ---- Cropping ----
  const [cropQueue, setCropQueue] = useState([]); // picked files waiting to be cropped
  const [cropSrc, setCropSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropping, setCropping] = useState(false);

  // ---- Delete confirmation ----
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(activeSearch ? { search: activeSearch } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await api.get(`/admin/products?${queryParams.toString()}`);
      // If the last item on the last page was just deleted, step back a page.
      if (res.products.length === 0 && page > 1) {
        setPage(Math.max(res.totalPages, 1));
        return;
      }
      setProducts(res.products);
      setTotalPages(res.totalPages);
      setTotalProducts(res.total);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit, activeSearch, categoryFilter, statusFilter]);

  // Active (not deleted) categories for the dropdowns.
  useEffect(() => {
    api
      .get("/products/categories")
      .then((res) => setCategories(res.categories || []))
      .catch(() => {});
  }, []);

  // Make a temporary address for the picture being cropped.
  useEffect(() => {
    if (cropQueue.length === 0) {
      setCropSrc("");
      return;
    }
    const url = URL.createObjectURL(cropQueue[0]);
    setCropSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [cropQueue]);

  // ---------------------------------------------------------------------
  // Search / filters
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Form open / close
  // ---------------------------------------------------------------------
  const releasePreviews = (list) =>
    list.forEach((img) => img.preview && URL.revokeObjectURL(img.preview));

  const closeForm = () => {
    releasePreviews(images);
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setCropQueue([]);
    setFormError("");
  };

  const openAddForm = () => {
    releasePreviews(images);
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
    setCropQueue([]);
    setFormError("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditForm = (p) => {
    releasePreviews(images);
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      discountPercentage: String(p.discountPercentage || 0),
      stock: String(p.stock),
      category: p.category && !p.category.isDeleted ? p.category._id : "",
      highlightsText: (p.highlights || []).join("\n"),
      isPublished: p.isPublished,
    });
    setImages((p.images || []).map((url) => ({ key: nextKey(), existing: url })));
    setCropQueue([]);
    setFormError("");
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------------------------------------------------------------------
  // Images: pick, crop, reorder, remove
  // ---------------------------------------------------------------------
  const handleFilesPicked = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // so the same file can be picked again later
    if (files.length === 0) return;

    setFormError("");
    const valid = [];
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setFormError("Only JPG, PNG or WEBP images are allowed.");
        continue;
      }
      if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) {
        setFormError(`Each image must be ${MAX_ORIGINAL_MB}MB or smaller.`);
        continue;
      }
      valid.push(file);
    }

    const room = MAX_IMAGES - images.length - cropQueue.length;
    if (valid.length > room) {
      setFormError(`A product can have at most ${MAX_IMAGES} images.`);
    }
    if (room > 0 && valid.length > 0) {
      setCropQueue((q) => [...q, ...valid.slice(0, room)]);
    }
  };

  const confirmCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      setCropping(true);
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const preview = URL.createObjectURL(blob);
      setImages((prev) => [...prev, { key: nextKey(), blob, preview }]);
      setCropQueue((q) => q.slice(1));
    } catch (err) {
      setFormError(err.message || "Could not crop that image.");
      setCropQueue((q) => q.slice(1));
    } finally {
      setCropping(false);
    }
  };

  const skipCrop = () => setCropQueue((q) => q.slice(1));
  const cancelAllCrops = () => setCropQueue([]);

  const removeImage = (key) => {
    setImages((prev) => {
      const gone = prev.find((i) => i.key === key);
      if (gone && gone.preview) URL.revokeObjectURL(gone.preview);
      return prev.filter((i) => i.key !== key);
    });
  };

  const makeFirst = (key) => {
    setImages((prev) => {
      const item = prev.find((i) => i.key === key);
      return item ? [item, ...prev.filter((i) => i.key !== key)] : prev;
    });
  };

  // ---------------------------------------------------------------------
  // Save (add or edit)
  // ---------------------------------------------------------------------
  const handleSave = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const description = form.description.trim();
    const price = Number(form.price);
    const discountPercentage = form.discountPercentage === "" ? 0 : Number(form.discountPercentage);
    const stock = Number(form.stock);
    const highlights = form.highlightsText
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean);

    // Friendly checks here; the backend checks everything again.
    if (name.length < 2 || name.length > 120) return setFormError("Name must be between 2 and 120 characters.");
    if (description.length < 10 || description.length > 2000)
      return setFormError("Description must be between 10 and 2000 characters.");
    if (!Number.isFinite(price) || price <= 0) return setFormError("Price must be greater than 0.");
    if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 90)
      return setFormError("Discount must be between 0 and 90.");
    if (form.stock === "" || !Number.isInteger(stock) || stock < 0)
      return setFormError("Stock must be a whole number of 0 or more.");
    if (!form.category) return setFormError("Please choose a category.");
    if (images.length === 0) return setFormError("Please add at least one product image.");
    if (highlights.length > 10) return setFormError("At most 10 highlights are allowed.");
    if (highlights.some((h) => h.length > 150)) return setFormError("Each highlight must be at most 150 characters.");

    try {
      setSaving(true);
      setFormError("");

      // 1. Upload the new (already cropped) pictures, all in one request.
      const newOnes = images.filter((i) => i.blob);
      let uploadedPaths = [];
      if (newOnes.length > 0) {
        const fd = new FormData();
        newOnes.forEach((img, i) => fd.append("images", img.blob, `product-${i}.jpg`));
        const res = await api.postForm("/admin/uploads/products", fd);
        uploadedPaths = res.images;
      }

      // 2. Keep the admin's order: saved pictures stay, new ones take their uploaded path.
      let nextUploaded = 0;
      const finalImages = images.map((img) => (img.existing ? img.existing : uploadedPaths[nextUploaded++]));

      // 3. Save the product.
      const payload = {
        name,
        description,
        price,
        discountPercentage,
        stock,
        category: form.category,
        images: finalImages,
        highlights,
        isPublished: form.isPublished,
      };
      if (editingId) {
        await api.put(`/admin/products/${editingId}`, payload);
      } else {
        await api.post("/admin/products", payload);
        setPage(1); // newest first
      }

      closeForm();
      await fetchProducts();
    } catch (err) {
      setFormError(err.message || "Could not save the product.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------
  // Publish toggle and soft delete
  // ---------------------------------------------------------------------
  const togglePublish = async (p) => {
    try {
      await api.patch(`/admin/products/${p._id}/publish`, { isPublished: !p.isPublished });
      await fetchProducts();
    } catch (err) {
      setError(err.message || "Failed to change publish status.");
    }
  };

  const openDeleteModal = (p) => {
    setSelected(p);
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selected) return;
    try {
      setDeleting(true);
      await api.delete(`/admin/products/${selected._id}`);
      setModalOpen(false);
      setSelected(null);
      await fetchProducts();
    } catch (err) {
      setError(err.message || "Failed to delete product.");
      setModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // ---------------------------------------------------------------------
  // Screen
  // ---------------------------------------------------------------------
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
          <h2 style={{ fontSize: "32px", color: "var(--color-espresso)" }}>Product Management</h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Add products, upload and crop their photos, and control what customers can see.
          </p>
        </div>

        <AlertBanner type="error" message={error} onClose={() => setError("")} />

        {/* Toolbar */}
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
            style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1", minWidth: "280px", maxWidth: "500px" }}
          >
            <div style={{ position: "relative", flex: "1" }}>
              <input
                type="text"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: "38px", height: "42px" }}
              />
              <Search size={16} color="#A8A29E" style={{ position: "absolute", left: "12px", top: "13px" }} />
            </div>
            <button type="submit" className="btn-primary" style={{ padding: "10px 18px", fontSize: "12px", height: "42px" }}>
              Search
            </button>
            {(search || activeSearch) && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="btn-secondary"
                title="Reset search and view all products"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 14px", fontSize: "12px", height: "42px" }}
              >
                <X size={14} /> Clear
              </button>
            )}
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ width: "170px", padding: "8px" }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="form-input"
              style={{ width: "150px", padding: "8px" }}
            >
              <option value="">All statuses</option>
              <option value="published">Published</option>
              <option value="unpublished">Unpublished</option>
            </select>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="form-input"
              style={{ width: "70px", padding: "8px" }}
              title="Per page"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>

            <button
              type="button"
              onClick={openAddForm}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 18px", fontSize: "12px", height: "42px" }}
            >
              <Plus size={14} /> Add Product
            </button>
          </div>
        </div>

        {/* Add / edit form */}
        {formOpen && (
          <form onSubmit={handleSave} className="luxury-card" style={{ padding: "24px", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "18px", color: "var(--color-espresso)", marginBottom: "16px" }}>
              {editingId ? "Edit Product" : "New Product"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="p-name">Name</label>
                <input id="p-name" type="text" className="form-input" value={form.name} maxLength={120} onChange={setField("name")} placeholder="e.g. Classic Leather Tote" autoFocus />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="p-desc">Description</label>
                <textarea id="p-desc" className="form-input" rows={4} value={form.description} maxLength={2000} onChange={setField("description")} placeholder="At least 10 characters" />
              </div>

              <div>
                <label className="form-label" htmlFor="p-price">Price (₹)</label>
                <input id="p-price" type="number" min="0" step="0.01" className="form-input" value={form.price} onChange={setField("price")} />
              </div>

              <div>
                <label className="form-label" htmlFor="p-discount">Discount (%)</label>
                <input id="p-discount" type="number" min="0" max="90" step="1" className="form-input" value={form.discountPercentage} onChange={setField("discountPercentage")} />
              </div>

              <div>
                <label className="form-label" htmlFor="p-stock">Stock</label>
                <input id="p-stock" type="number" min="0" step="1" className="form-input" value={form.stock} onChange={setField("stock")} />
              </div>

              <div>
                <label className="form-label" htmlFor="p-category">Category</label>
                <select id="p-category" className="form-input" value={form.category} onChange={setField("category")}>
                  <option value="">Choose a category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label className="form-label" htmlFor="p-highlights">Highlights (one per line, up to 10)</label>
                <textarea id="p-highlights" className="form-input" rows={3} value={form.highlightsText} onChange={setField("highlightsText")} placeholder={"Genuine leather\n1 year warranty"} />
              </div>
            </div>

            {/* Images */}
            <div style={{ marginBottom: "16px" }}>
              <span className="form-label">
                Images ({images.length}/{MAX_IMAGES}) — the first image is shown on the shop
              </span>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", margin: "8px 0 12px" }}>
                {images.map((img, i) => (
                  <div key={img.key} style={{ width: "110px" }}>
                    <div style={{ position: "relative" }}>
                      <img
                        src={img.preview || imageUrl(img.existing)}
                        alt={`Product ${i + 1}`}
                        style={{ width: "110px", height: "110px", objectFit: "cover", borderRadius: "4px", border: i === 0 ? "2px solid var(--color-espresso)" : "1px solid var(--color-border)", display: "block" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.key)}
                        title="Remove image"
                        aria-label="Remove image"
                        style={{ position: "absolute", top: "4px", right: "4px", width: "22px", height: "22px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {i === 0 ? (
                      <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Main image</span>
                    ) : (
                      <button type="button" onClick={() => makeFirst(img.key)} style={{ fontSize: "11px", background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--color-espresso)", textDecoration: "underline" }}>
                        Make main
                      </button>
                    )}
                  </div>
                ))}

                {images.length + cropQueue.length < MAX_IMAGES && (
                  <label
                    style={{ width: "110px", height: "110px", border: "1px dashed var(--color-border)", borderRadius: "4px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center" }}
                  >
                    <Upload size={18} />
                    Add photos
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFilesPicked} style={{ display: "none" }} />
                  </label>
                )}
              </div>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                JPG, PNG or WEBP. You'll crop each photo to a square, and it is resized to at most 800×800 before upload.
              </span>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", fontSize: "14px" }}>
              <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
              Published (visible to customers when in stock)
            </label>

            {formError && <p style={{ color: "var(--color-danger)", fontSize: "13px", marginBottom: "12px" }}>{formError}</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" disabled={saving || cropQueue.length > 0} style={{ padding: "10px 20px", fontSize: "12px" }}>
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Product"}
              </button>
              <button type="button" className="btn-secondary" onClick={closeForm} disabled={saving} style={{ padding: "10px 20px", fontSize: "12px" }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Products table */}
        <div className="luxury-table-wrapper">
          <table className="luxury-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>Loading products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px" }}>
                    {activeSearch || categoryFilter || statusFilter
                      ? "No products match these filters."
                      : "No products yet. Use “Add Product” to create the first one."}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {p.images && p.images[0] ? (
                          <img src={imageUrl(p.images[0])} alt={p.name} style={{ width: "44px", height: "44px", objectFit: "cover", borderRadius: "4px" }} />
                        ) : (
                          <Package size={24} color="var(--color-text-muted)" />
                        )}
                        <div>
                          <p style={{ fontWeight: 600, margin: 0, color: "var(--color-text-main)" }}>{p.name}</p>
                          <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>ID: {p._id.slice(-6)}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--color-text-body)" }}>
                      {p.category ? p.category.name : "—"}
                      {p.category && p.category.isDeleted && (
                        <span style={{ color: "var(--color-danger)", fontSize: "11px" }}> (deleted)</span>
                      )}
                    </td>
                    <td>
                      <strong>{formatPrice(p.finalPrice)}</strong>
                      {p.discountPercentage > 0 && (
                        <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                          <s>{formatPrice(p.price)}</s> · {p.discountPercentage}% off
                        </div>
                      )}
                    </td>
                    <td style={{ color: p.stock === 0 ? "var(--color-danger)" : "var(--color-text-body)", fontWeight: p.stock === 0 ? 600 : 400 }}>
                      {p.stock === 0 ? "Out of stock" : p.stock}
                    </td>
                    <td>
                      {p.isPublished ? (
                        <span className="badge badge-active">Published</span>
                      ) : (
                        <span className="badge badge-blocked">Unpublished</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => togglePublish(p)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "11px", letterSpacing: "0.5px" }}>
                          {p.isPublished ? (
                            <>
                              <EyeOff size={13} /> Unpublish
                            </>
                          ) : (
                            <>
                              <Eye size={13} /> Publish
                            </>
                          )}
                        </button>
                        <button type="button" onClick={() => openEditForm(p)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "11px", letterSpacing: "0.5px" }}>
                          <Pencil size={13} /> Edit
                        </button>
                        <button type="button" onClick={() => openDeleteModal(p)} className="btn-danger" style={{ padding: "6px 12px", fontSize: "11px", letterSpacing: "0.5px" }}>
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "24px", flexWrap: "wrap", gap: "16px" }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalProducts} products)
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ padding: "8px 14px", fontSize: "12px" }}>
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-espresso)", padding: "0 8px" }}>{page}</span>
            <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ padding: "8px 14px", fontSize: "12px" }}>
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Product"
          message={`Are you sure you want to delete “${selected?.name}”? Customers will no longer see it, and it becomes invalid in any cart that holds it. The record itself is kept, not erased.`}
          confirmText="Delete Product"
          isDanger={true}
          isLoading={deleting}
        />

        {/* Crop window: shown while there are picked photos waiting to be cropped */}
        {cropQueue.length > 0 && cropSrc && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
          >
            <div style={{ background: "#FFFFFF", borderRadius: "4px", width: "100%", maxWidth: "520px", padding: "20px" }}>
              <h3 style={{ fontSize: "16px", color: "var(--color-espresso)", marginBottom: "4px" }}>Crop photo</h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "12px" }}>
                Photo 1 of {cropQueue.length} waiting. Drag to move, use the slider to zoom.
              </p>

              <div style={{ position: "relative", width: "100%", height: "340px", background: "#222" }}>
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0" }}>
                <span style={{ fontSize: "12px" }}>Zoom</span>
                <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1 }} />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
                {cropQueue.length > 1 && (
                  <button type="button" className="btn-secondary" onClick={cancelAllCrops} disabled={cropping} style={{ padding: "8px 14px", fontSize: "12px" }}>
                    Cancel all
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={skipCrop} disabled={cropping} style={{ padding: "8px 14px", fontSize: "12px" }}>
                  Skip this photo
                </button>
                <button type="button" className="btn-primary" onClick={confirmCrop} disabled={cropping || !croppedAreaPixels} style={{ padding: "8px 18px", fontSize: "12px" }}>
                  {cropping ? "Cropping..." : "Crop & add"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
