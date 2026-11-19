import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import { ShieldCheck, Lock, Mail, ArrowRight, ArrowLeft } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please provide administrator email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/admin/login", formData);
      login(res.token, res.user);
      navigate("/admin/users", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid administrator credentials or unauthorized.");
    } finally {
      setLoading(false);
    }
  };

  // Demo helper for the reviewer
  const fillSampleAdmin = () => {
    setFormData({
      email: "admin@shoposphere.com",
      password: "Admin@123456",
    });
    setError("");
  };

  return (
    <div style={{ padding: "80px 0", minHeight: "75vh" }}>
      <div className="container" style={{ maxWidth: "440px" }}>
        <div
          className="luxury-card"
          style={{
            border: "1px solid var(--color-espresso)",
            backgroundColor: "#FFFFFF",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "var(--color-espresso)",
                color: "#FFFFFF",
                marginBottom: "16px",
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "var(--color-espresso)",
                fontWeight: 600,
                display: "block",
              }}
            >
              Staff & Concierge Access
            </span>
            <h2 style={{ fontSize: "28px", marginTop: "4px", color: "var(--color-espresso)" }}>
              Admin Portal
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
              Secure management console for ShopSphere operations.
            </p>
          </div>

          <AlertBanner type="error" message={error} onClose={() => setError("")} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">
                Admin Email Address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@shoposphere.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <Mail
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">
                Admin Security Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="admin-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <Lock
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", marginTop: "12px" }}
            >
              {loading ? "Verifying Authorization..." : "Access Admin Console"}{" "}
              <ArrowRight size={15} />
            </button>

            {/* Quick-fill button for viva reviewer */}
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={fillSampleAdmin}
                style={{
                  fontSize: "11px",
                  color: "var(--color-espresso)",
                  background: "var(--color-sand)",
                  border: "1px dashed var(--color-espresso)",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                ⚡ Reviewer Viva: Fill Admin (admin@shoposphere.com)
              </button>
            </div>

            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                }}
              >
                <ArrowLeft size={13} /> Return to Customer Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
