import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, blockedAlert, clearBlockedAlert, sessionAlert, clearSessionAlert } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
    if (blockedAlert) clearBlockedAlert();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/login", formData);
      login(res.token, res.user);

      // Redirect to previous intended destination or profile
      const redirectPath = location.state?.from?.pathname || "/profile";
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || "Invalid credentials or account blocked.");
    } finally {
      setLoading(false);
    }
  };

  // Demo helper for the reviewer
  const fillSampleCustomer = () => {
    setFormData({
      email: "elena.vance@luxury.com",
      password: "Customer@123456",
    });
    setError("");
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "440px" }}>
        <div className="luxury-card">
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              Client Concierge
            </span>
            <h2 style={{ fontSize: "28px", marginTop: "4px", color: "var(--color-espresso)" }}>
              Welcome Back
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
              Sign in to manage your orders, addresses, and wishlist.
            </p>
          </div>

          {/* Blocked Account Forced Alert */}
          {blockedAlert && (
            <AlertBanner
              type="error"
              message={blockedAlert}
              onClose={clearBlockedAlert}
            />
          )}

          {sessionAlert && (
            <AlertBanner
              type="error"
              message={sessionAlert}
              onClose={clearSessionAlert}
            />
          )}

          <AlertBanner type="error" message={error} onClose={() => setError("")} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                Email Address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@luxury.com"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label className="form-label" htmlFor="password" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: "11px",
                    color: "var(--color-espresso)",
                    textDecoration: "underline",
                  }}
                >
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
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
              {loading ? "Authenticating..." : "Sign In to Account"}{" "}
              <ArrowRight size={15} />
            </button>

            {/* Viva Demo Quick Button */}
            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <button
                type="button"
                onClick={fillSampleCustomer}
                style={{
                  fontSize: "11px",
                  color: "var(--color-espresso)",
                  background: "var(--color-sand)",
                  border: "1px dashed var(--color-border-dark)",
                  padding: "6px 12px",
                  borderRadius: "2px",
                  cursor: "pointer",
                }}
              >
                ⚡ Viva Demo: Fill Sample Customer (Elena Vance)
              </button>
            </div>

            <div
              style={{
                textAlign: "center",
                marginTop: "24px",
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              New to ShopSphere?{" "}
              <Link
                to="/register"
                style={{
                  color: "var(--color-espresso)",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Create an Account
              </Link>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                marginTop: "24px",
                paddingTop: "16px",
                textAlign: "center",
              }}
            >
              <Link
                to="/admin/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11px",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                <ShieldCheck size={14} />
                Administrator Portal Access
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
