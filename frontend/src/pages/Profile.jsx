import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  MapPin,
  Calendar,
  Edit3,
  Lock,
  Plus,
  CheckCircle2,
} from "lucide-react";

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/users/profile");
        if (res.success) {
          setProfileData(res.data.user);
          setAddresses(res.data.addresses);
          updateUser(res.data.user);
        }
      } catch (err) {
        setError(err.message || "Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const defaultAddress = addresses.find((a) => a.isDefault) || addresses[0];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: "var(--color-espresso)" }}>
        Loading your bespoke profile...
      </div>
    );
  }

  const currentUser = profileData || user;

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        <AlertBanner type="error" message={error} onClose={() => setError("")} />

        {/* Profile Header Card */}
        <div className="luxury-card" style={{ marginBottom: "32px", padding: "40px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
              {/* Avatar */}
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  border: "2px solid var(--color-espresso)",
                  padding: "3px",
                  backgroundColor: "#FFFFFF",
                  flexShrink: 0,
                }}
              >
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-espresso)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "32px",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {currentUser?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Identity */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                  <h2 style={{ fontSize: "28px", margin: 0 }}>{currentUser?.name}</h2>
                  <span className="badge badge-default">
                    {currentUser?.role === "admin" ? "Concierge Admin" : "Atelier Member"}
                  </span>
                </div>
                <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: "4px 0" }}>
                  {currentUser?.email}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "var(--color-text-light)",
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                    <Calendar size={13} /> Member Since{" "}
                    {currentUser?.createdAt
                      ? new Date(currentUser.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "2026"}
                  </span>
                  {currentUser?.phone && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                      <Phone size={13} /> {currentUser.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Link to="/profile/edit" className="btn-secondary" style={{ padding: "10px 18px", fontSize: "12px" }}>
                <Edit3 size={14} /> Edit Profile
              </Link>
              <Link to="/profile/change-password" className="btn-secondary" style={{ padding: "10px 18px", fontSize: "12px" }}>
                <Lock size={14} /> Change Password
              </Link>
            </div>
          </div>
        </div>

        {/* 2-Column Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "28px" }}>
          {/* Account Details Box */}
          <div className="luxury-card">
            <h3
              style={{
                fontSize: "18px",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "14px",
                marginBottom: "20px",
              }}
            >
              Account Credentials
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <span className="form-label">Full Legal Name</span>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-main)" }}>
                  {currentUser?.name}
                </p>
              </div>

              <div>
                <span className="form-label">Registered Email</span>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-main)" }}>
                  {currentUser?.email}
                </p>
              </div>

              <div>
                <span className="form-label">Contact Telephone</span>
                <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-main)" }}>
                  {currentUser?.phone || "No phone number linked yet"}
                </p>
              </div>

              <div>
                <span className="form-label">Account Privilege</span>
                <span className="badge badge-active">
                  <CheckCircle2 size={12} /> Good Standing / Active
                </span>
              </div>
            </div>

            <div style={{ marginTop: "28px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <Link
                to="/profile/edit"
                style={{
                  fontSize: "12px",
                  color: "var(--color-espresso)",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Update Name, Telephone or Verify New Email &rarr;
              </Link>
            </div>
          </div>

          {/* Primary Saved Address Overview */}
          <div className="luxury-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--color-border)",
                paddingBottom: "14px",
                marginBottom: "20px",
              }}
            >
              <h3 style={{ fontSize: "18px", margin: 0 }}>Primary Shipping Address</h3>
              <Link
                to="/addresses"
                style={{
                  fontSize: "12px",
                  color: "var(--color-espresso)",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Manage All ({addresses.length})
              </Link>
            </div>

            {defaultAddress ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span className="badge badge-default">Default Address</span>
                  <span className="badge badge-role">{defaultAddress.addressType}</span>
                </div>
                <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-main)" }}>
                  {defaultAddress.fullName}
                </p>
                <p style={{ fontSize: "14px", color: "var(--color-text-body)", marginTop: "4px" }}>
                  {defaultAddress.streetAddress}
                </p>
                <p style={{ fontSize: "14px", color: "var(--color-text-body)" }}>
                  {defaultAddress.city}, {defaultAddress.state} — {defaultAddress.postalCode}
                </p>
                <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                  {defaultAddress.country} • Phone: {defaultAddress.phone}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "30px 0" }}>
                <MapPin size={32} color="#A8A29E" style={{ marginBottom: "12px" }} />
                <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "16px" }}>
                  No shipping residence has been added yet.
                </p>
                <Link to="/addresses" className="btn-secondary" style={{ padding: "8px 16px", fontSize: "11px" }}>
                  <Plus size={13} /> Add Delivery Address
                </Link>
              </div>
            )}

            <div style={{ marginTop: "28px", borderTop: "1px solid var(--color-border)", paddingTop: "16px" }}>
              <Link
                to="/addresses"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--color-espresso)",
                  fontWeight: 600,
                }}
              >
                <MapPin size={14} /> View All Saved Delivery Destinations &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
