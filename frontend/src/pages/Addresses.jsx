import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import Modal from "../components/Modal";
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Building,
  Home as HomeIcon,
  X,
} from "lucide-react";

const Addresses = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal & Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initialForm = {
    fullName: "",
    phone: "",
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    addressType: "Home",
    isDefault: false,
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/addresses");
      if (res.success) {
        setAddresses(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load addresses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData(initialForm);
    setIsFormOpen(true);
    setError("");
  };

  const openEditModal = (addr) => {
    setEditingAddress(addr);
    setFormData({
      fullName: addr.fullName,
      phone: addr.phone,
      streetAddress: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      postalCode: addr.postalCode,
      country: addr.country || "India",
      addressType: addr.addressType || "Home",
      isDefault: addr.isDefault || false,
    });
    setIsFormOpen(true);
    setError("");
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const { fullName, phone, streetAddress, city, state, postalCode } = formData;
    if (![fullName, phone, streetAddress, city, state, postalCode].every((value) => value.trim())) {
      setError("Please complete all required address fields.");
      return;
    }
    if (!/^\+?[0-9()\s-]{7,20}$/.test(phone.trim())) {
      setError("Please provide a valid phone number.");
      return;
    }
    if (streetAddress.trim().length < 5) {
      setError("Street address must be at least 5 characters.");
      return;
    }
    if (city.trim().length < 2 || state.trim().length < 2) {
      setError("City and state must each contain at least 2 characters.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,11}$/.test(postalCode.trim())) {
      setError("Please provide a valid postal / ZIP code.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingAddress) {
        const res = await api.put(`/addresses/${editingAddress._id}`, formData);
        setSuccessMsg(res.message || "Address updated successfully.");
      } else {
        const res = await api.post("/addresses", formData);
        setSuccessMsg(res.message || "Address added successfully.");
      }
      setIsFormOpen(false);
      await fetchAddresses();
    } catch (err) {
      setError(err.message || "Error saving address.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set Default Address
  const handleSetDefault = async (id) => {
    try {
      const res = await api.patch(`/addresses/${id}/default`);
      setSuccessMsg(res.message || "Default address updated.");
      await fetchAddresses();
    } catch (err) {
      setError(err.message || "Failed to set default address.");
    }
  };

  // Delete Address confirmation
  const confirmDelete = (addr) => {
    setAddressToDelete(addr);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!addressToDelete) return;
    try {
      setIsDeleting(true);
      const res = await api.delete(`/addresses/${addressToDelete._id}`);
      setSuccessMsg(res.message || "Address deleted successfully.");
      setDeleteModalOpen(false);
      setAddressToDelete(null);
      await fetchAddresses();
    } catch (err) {
      setError(err.message || "Failed to delete address.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <Link
            to="/profile"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              color: "var(--color-espresso)",
            }}
          >
            <ArrowLeft size={15} /> Back to Profile Overview
          </Link>

          <button
            type="button"
            className="btn-primary"
            onClick={openAddModal}
            style={{ padding: "10px 18px", fontSize: "12px" }}
          >
            <Plus size={14} /> Add New Address
          </button>
        </div>

        <div style={{ marginBottom: "32px" }}>
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "2.5px",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
            }}
          >
            Shipping Registry
          </span>
          <h2 style={{ fontSize: "28px", color: "var(--color-espresso)", marginTop: "4px" }}>
            Saved Delivery Addresses
          </h2>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Manage delivery locations for complimentary white-glove concierge dispatch.
          </p>
        </div>

        <AlertBanner type="error" message={error} onClose={() => setError("")} />
        <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--color-espresso)" }}>
            Retrieving your address registry...
          </div>
        ) : addresses.length === 0 ? (
          <div className="luxury-card" style={{ textAlign: "center", padding: "60px 20px" }}>
            <MapPin size={40} color="#A8A29E" style={{ marginBottom: "16px" }} />
            <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>No Saved Addresses</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Add a shipping address to expedite checkout on future collections.
            </p>
            <button type="button" className="btn-primary" onClick={openAddModal}>
              <Plus size={14} /> Add Primary Address
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {addresses.map((addr) => (
              <div
                key={addr._id}
                className="luxury-card"
                style={{
                  position: "relative",
                  border: addr.isDefault
                    ? "2px solid var(--color-espresso)"
                    : "1px solid var(--color-border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="badge badge-role">
                        {addr.addressType === "Work" ? (
                          <Building size={11} style={{ marginRight: "4px" }} />
                        ) : (
                          <HomeIcon size={11} style={{ marginRight: "4px" }} />
                        )}
                        {addr.addressType}
                      </span>
                      {addr.isDefault && (
                        <span className="badge badge-default">
                          <CheckCircle2 size={11} style={{ marginRight: "4px" }} />
                          Default Address
                        </span>
                      )}
                    </div>
                  </div>

                  <h4 style={{ fontSize: "16px", marginBottom: "6px" }}>{addr.fullName}</h4>
                  <p style={{ fontSize: "14px", color: "var(--color-text-body)", lineHeight: "1.5" }}>
                    {addr.streetAddress}
                  </p>
                  <p style={{ fontSize: "14px", color: "var(--color-text-body)", lineHeight: "1.5" }}>
                    {addr.city}, {addr.state} — {addr.postalCode}
                  </p>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
                    {addr.country} • Phone: {addr.phone}
                  </p>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    marginTop: "20px",
                    paddingTop: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {!addr.isDefault ? (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(addr._id)}
                      style={{
                        fontSize: "12px",
                        color: "var(--color-espresso)",
                        textDecoration: "underline",
                        fontWeight: 600,
                      }}
                    >
                      Make Default
                    </button>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)", letterSpacing: "1px" }}>
                      PRIMARY DESTINATION
                    </span>
                  )}

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(addr)}
                      style={{
                        padding: "6px",
                        color: "var(--color-text-body)",
                        borderRadius: "2px",
                      }}
                      title="Edit Address"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => confirmDelete(addr)}
                      style={{
                        padding: "6px",
                        color: "var(--color-danger)",
                        borderRadius: "2px",
                      }}
                      title="Delete Address"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD / EDIT ADDRESS MODAL */}
        {isFormOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(28, 25, 23, 0.6)",
              backdropFilter: "blur(2px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "16px",
            }}
            onClick={() => setIsFormOpen(false)}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--color-border)",
                borderRadius: "2px",
                maxWidth: "540px",
                width: "100%",
                padding: "32px",
                maxHeight: "90vh",
                overflowY: "auto",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setIsFormOpen(false)}
                style={{ position: "absolute", top: "20px", right: "20px", color: "#78716C" }}
              >
                <X size={18} />
              </button>

              <h3 style={{ fontSize: "22px", color: "var(--color-espresso)", marginBottom: "4px" }}>
                {editingAddress ? "Edit Shipping Address" : "Add Delivery Address"}
              </h3>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "24px" }}>
                Ensure your delivery details match official postal standards.
              </p>

              <AlertBanner type="error" message={error} onClose={() => setError("")} />

              <form onSubmit={handleFormSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="form-input"
                      placeholder="Recipient Name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Telephone</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="form-input"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address & Landmark</label>
                  <input
                    type="text"
                    required
                    value={formData.streetAddress}
                    onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                    className="form-input"
                    placeholder="Apt, Suite, Street Name"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Mumbai"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">State / Province</label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="form-input"
                      placeholder="e.g. Maharashtra"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="form-label">Postal / ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      className="form-input"
                      placeholder="e.g. 400018"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Address Category</label>
                    <select
                      value={formData.addressType}
                      onChange={(e) => setFormData({ ...formData, addressType: e.target.value })}
                      className="form-input"
                    >
                      <option value="Home">Home / Residence</option>
                      <option value="Work">Office / Atelier</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "16px 0 24px 0" }}>
                  <input
                    id="isDefaultCheck"
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    style={{ accentColor: "var(--color-espresso)", width: "16px", height: "16px" }}
                  />
                  <label htmlFor="isDefaultCheck" style={{ fontSize: "13px", cursor: "pointer" }}>
                    Set as default primary shipping residence
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : editingAddress ? "Update Address" : "Save Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDelete}
          title="Delete Shipping Address"
          message={`Are you sure you wish to delete the address for "${addressToDelete?.fullName}" (${addressToDelete?.streetAddress})? This action cannot be reversed.`}
          confirmText="Delete Address"
          isDanger={true}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
};

export default Addresses;
