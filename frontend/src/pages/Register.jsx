import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import AlertBanner from "../components/AlertBanner";
import CountdownTimer from "../components/CountdownTimer";
import { ArrowRight, CheckCircle2, Lock, Mail, User as UserIcon } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form states
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };
  

  // Step 1: Submit Details & Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");

    const { name, email, password, confirmPassword } = formData;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please complete all required fields.");
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      setError("Please provide a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/register-otp", {
        name,
        email,
        password,
      });

      setSuccessMsg(res.message || "Verification code dispatched to your email.");
      setStep(2);
    } catch (err) {
      setError(err.message || "Failed to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle single digit OTP box inputs
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Step 2: Resend OTP
  const handleResendOTP = async () => {
    try {
      setResending(true);
      setError("");
      const res = await api.post("/auth/resend-register-otp", {
        email: formData.email,
      });
      setSuccessMsg(res.message || "Fresh verification code dispatched.");
    } catch (err) {
      setError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP & Complete Registration
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError("");

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    try {
      setLoading(true);
      const res = await api.post("/auth/verify-register-otp", {
        email: formData.email,
        otp: fullOtp,
      });

      // Login user with returned token and profile
      login(res.token, res.user);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "60px 0" }}>
      <div className="container" style={{ maxWidth: "480px" }}>
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
              Atelier Society
            </span>
            <h2 style={{ fontSize: "28px", marginTop: "4px", color: "var(--color-espresso)" }}>
              {step === 1 ? "Create Your Account" : "Verify Your Email"}
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "6px" }}>
              {step === 1
                ? "Join our quiet-luxury community for bespoke privileges."
                : `A 6-digit security code was dispatched to ${formData.email}`}
            </p>
          </div>

          <AlertBanner type="error" message={error} onClose={() => setError("")} />
          <AlertBanner type="success" message={successMsg} onClose={() => setSuccessMsg("")} />

          {step === 1 ? (
            /* STEP 1: REGISTRATION DETAILS */
            <form onSubmit={handleRequestOTP}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full Name
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Julian Sterling"
                    value={formData.name}
                    onChange={handleChange}
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
                <label className="form-label" htmlFor="password">
                  Password (Min. 6 Characters)
                </label>
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

              <div className="form-group">
                <label className="form-label" htmlFor="confirmPassword">
                  Confirm Password
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
                style={{ width: "100%", marginTop: "12px" }}
              >
                {loading ? "Generating Verification Code..." : "Continue to Verification"}{" "}
                <ArrowRight size={15} />
              </button>

              <div
                style={{
                  textAlign: "center",
                  marginTop: "24px",
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                }}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "var(--color-espresso)",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  Sign In
                </Link>
              </div>
            </form>
          ) : (
            /* STEP 2: OTP VERIFICATION */
            <form onSubmit={handleVerifyAndRegister}>
              <div className="otp-inputs">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
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

              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ width: "100%", marginTop: "24px" }}
              >
                {loading ? "Confirming Code..." : "Verify & Create Account"}
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
                Change Registration Email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
