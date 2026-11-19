import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import CountdownTimer from "../components/CountdownTimer";
import { Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Verify OTP & Enter New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Step 1: Send Password Reset OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please provide your registered email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/forgot-password", { email });
      setSuccessMsg(res.message || "Reset verification code sent to your email.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Unable to send reset code. Please verify your email.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Resend OTP
  const handleResendOTP = async () => {
    try {
      setResending(true);
      setError("");
      const res = await api.post("/auth/forgot-password", { email });
      setSuccessMsg(res.message || "Fresh reset verification code dispatched.");
    } catch (err) {
      setError(err.message || "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  // Handle single digit OTP box inputs
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Step 2: Submit Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/reset-password", {
        email,
        otp: fullOtp,
        newPassword,
      });

      setSuccessMsg(res.message);
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
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
              Security Assistance
            </span>
            <h2 style={{ fontSize: "28px", marginTop: "4px", color: "var(--color-espresso)" }}>
              Reset Password
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
              {step === 1
                ? "Enter your email to receive a secure recovery code."
                : `Enter the code dispatched to ${email}`}
            </p>
          </div>

          <AlertBanner type="error" message={error} onClose={() => setError("")} />
          <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

          {step === 1 ? (
            <form onSubmit={handleSendOTP}>
              <div className="form-group">
                <label className="form-label" htmlFor="reset-email">
                  Registered Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    placeholder="name@luxury.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
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
                className="btn-primary"
                disabled={loading}
                style={{ width: "100%", marginTop: "12px" }}
              >
                {loading ? "Dispatching Code..." : "Send Verification Code"}{" "}
                <ArrowRight size={15} />
              </button>

              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <Link
                  to="/login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword}>
              <div className="otp-inputs">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`reset-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="otp-digit"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <CountdownTimer
                initialSeconds={60}
                onResend={handleResendOTP}
                isResending={resending}
              />

              <div className="form-group" style={{ marginTop: "20px" }}>
                <label className="form-label" htmlFor="newPassword">
                  New Password (Min. 6 Chars)
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? "Resetting Password..." : "Update Password & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: "100%",
                  textAlign: "center",
                  marginTop: "16px",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  textDecoration: "underline",
                }}
              >
                Enter a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
