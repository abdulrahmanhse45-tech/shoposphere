import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import { Lock, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";

const ChangePassword = () => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword) {
      setErrorMsg("Please provide both current and new password.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match. Please verify.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.put("/users/change-password", {
        currentPassword,
        newPassword,
      });

      setSuccessMsg(res.message || "Password updated successfully.");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setErrorMsg(err.message || "Failed to update password. Verify current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "520px" }}>
        <div style={{ marginBottom: "24px" }}>
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
        </div>

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
              Account Security
            </span>
            <h2 style={{ fontSize: "28px", marginTop: "4px", color: "var(--color-espresso)" }}>
              Update Password
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
              Choose a strong, unique passphrase to safeguard your account.
            </p>
          </div>

          <AlertBanner type="error" message={errorMsg} onClose={() => setErrorMsg("")} />
          <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="currentPassword">
                Current Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <KeyRound
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="newPassword">
                New Password (Min. 6 Characters)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.newPassword}
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

            <div className="form-group">
              <label className="form-label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
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
              style={{ width: "100%", marginTop: "16px" }}
            >
              <ShieldCheck size={15} />
              {loading ? "Securing Password..." : "Save New Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
