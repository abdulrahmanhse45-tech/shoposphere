import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import CountdownTimer from "../components/CountdownTimer";
import {
  User as UserIcon,
  Phone,
  Image as ImageIcon,
  Mail,
  ArrowLeft,
  CheckCircle,
  Save,
  ShieldCheck,
} from "lucide-react";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Basic Profile Info State
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Email Change State (OTP Flow)
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState(["", "", "", "", "", ""]);
  const [emailStep, setEmailStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailResending, setEmailResending] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState("");
  const [emailError, setEmailError] = useState("");

  // Preset luxury avatars for convenient demo
  const sampleAvatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  ];

  // Handle Basic Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Full name cannot be blank.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.put("/users/profile", formData);
      if (res.success) {
        updateUser(res.user);
        setSuccessMsg(res.message || "Profile details updated successfully.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP to NEW Email
  const handleRequestEmailChangeOTP = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    if (!newEmail.trim()) {
      setEmailError("Please enter the new email address.");
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(newEmail)) {
      setEmailError("Please provide a valid email format.");
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.post("/users/change-email/otp", { newEmail });
      setEmailSuccess(res.message || "Verification code dispatched to new email.");
      setEmailStep(2);
    } catch (err) {
      setEmailError(err.message || "Unable to request email verification.");
    } finally {
      setEmailLoading(false);
    }
  };

  // Resend OTP to new email
  const handleResendEmailOTP = async () => {
    try {
      setEmailResending(true);
      setEmailError("");
      const res = await api.post("/users/change-email/otp", { newEmail });
      setEmailSuccess(res.message || "Fresh code sent to new email.");
    } catch (err) {
      setEmailError(err.message || "Failed to resend code.");
    } finally {
      setEmailResending(false);
    }
  };

  // Step 2: Verify OTP and update email
  const handleVerifyEmailChange = async (e) => {
    e.preventDefault();
    setEmailError("");
    setEmailSuccess("");

    const fullOtp = emailOtp.join("");
    if (fullOtp.length !== 6) {
      setEmailError("Please enter the complete 6-digit OTP code.");
      return;
    }

    try {
      setEmailLoading(true);
      const res = await api.post("/users/change-email/verify", {
        newEmail,
        otp: fullOtp,
      });

      if (res.success) {
        updateUser({ email: res.email });
        setEmailSuccess("Email successfully verified and updated!");
        setEmailStep(1);
        setNewEmail("");
        setEmailOtp(["", "", "", "", "", ""]);
      }
    } catch (err) {
      setEmailError(err.message || "Invalid or expired OTP code.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newArr = [...emailOtp];
    newArr[index] = value.slice(-1);
    setEmailOtp(newArr);
    setEmailError("");

    if (value && index < 5) {
      const nextInput = document.getElementById(`change-email-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        {/* Navigation Breadcrumb */}
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

        {/* SECTION 1: BASIC PROFILE UPDATE */}
        <div className="luxury-card" style={{ marginBottom: "32px" }}>
          <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px", marginBottom: "24px" }}>
            <span className="badge badge-default" style={{ marginBottom: "8px" }}>
              Personal Identity
            </span>
            <h2 style={{ fontSize: "24px", color: "var(--color-espresso)" }}>
              Edit Profile Details
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              Update your public display name, telephone, and signature avatar.
            </p>
          </div>

          <AlertBanner type="error" message={errorMsg} onClose={() => setErrorMsg("")} />
          <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Full Display Name
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <UserIcon
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Contact Telephone
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <Phone
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="avatar">
                Profile Picture URL
              </label>
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <input
                  id="avatar"
                  type="url"
                  placeholder="https://..."
                  value={formData.avatar}
                  onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  className="form-input"
                  style={{ paddingLeft: "38px" }}
                />
                <ImageIcon
                  size={16}
                  color="#A8A29E"
                  style={{ position: "absolute", left: "12px", top: "14px" }}
                />
              </div>

              {/* Preset Avatar Selection */}
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                Or choose a curated atelier portrait:
              </span>
              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                {sampleAvatars.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Avatar ${idx + 1}`}
                    onClick={() => setFormData({ ...formData, avatar: url })}
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      cursor: "pointer",
                      border:
                        formData.avatar === url
                          ? "2px solid var(--color-espresso)"
                          : "1px solid var(--color-border)",
                      padding: "2px",
                    }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: "12px" }}
            >
              <Save size={14} /> {loading ? "Saving Changes..." : "Save Profile Details"}
            </button>
          </form>
        </div>

        {/* SECTION 2: VERIFY EMAIL CHANGE VIA OTP */}
        <div className="luxury-card">
          <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "16px", marginBottom: "24px" }}>
            <span className="badge badge-default" style={{ marginBottom: "8px" }}>
              Security & Communications
            </span>
            <h2 style={{ fontSize: "24px", color: "var(--color-espresso)" }}>
              Change Email Address (OTP Protected)
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              Current active email: <strong>{user?.email}</strong>. Email changes require
              one-time passcode verification sent to the new address.
            </p>
          </div>

          <AlertBanner type="error" message={emailError} onClose={() => setEmailError("")} />
          <AlertBanner type="success" message={emailSuccess} onClose={() => setEmailSuccess("")} />

          {emailStep === 1 ? (
            <form onSubmit={handleRequestEmailChangeOTP}>
              <div className="form-group">
                <label className="form-label" htmlFor="newEmail">
                  New Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="newEmail"
                    type="email"
                    required
                    placeholder="new.email@luxury.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
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

              <button
                type="submit"
                className="btn-secondary"
                disabled={emailLoading}
                style={{ padding: "10px 20px" }}
              >
                <ShieldCheck size={14} />
                {emailLoading ? "Dispatching Code..." : "Send Verification Code to New Email"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyEmailChange}>
              <p style={{ fontSize: "13px", marginBottom: "16px" }}>
                Enter the 6-digit code dispatched to <strong>{newEmail}</strong>:
              </p>

              <div className="otp-inputs">
                {emailOtp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`change-email-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="otp-digit"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <CountdownTimer
                initialSeconds={60}
                onResend={handleResendEmailOTP}
                isResending={emailResending}
              />

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={emailLoading}
                >
                  <CheckCircle size={14} />
                  {emailLoading ? "Verifying..." : "Confirm & Update Email"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEmailStep(1)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditProfile;
