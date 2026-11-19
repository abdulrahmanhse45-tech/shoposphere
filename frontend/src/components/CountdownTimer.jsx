import React, { useState, useEffect } from "react";
import { RotateCw } from "lucide-react";

/**
 * Live Countdown Timer for OTP
 * Requirements: Live 60-second countdown timer and "Resend OTP" button
 * that enables once the countdown expires.
 */
const CountdownTimer = ({ initialSeconds = 60, onResend, isResending = false }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleResendClick = async () => {
    if (timeLeft > 0 || isResending) return;
    await onResend();
    setTimeLeft(initialSeconds);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "13px",
        marginTop: "16px",
      }}
    >
      {timeLeft > 0 ? (
        <span style={{ color: "var(--color-text-muted)" }}>
          Resend verification code in{" "}
          <strong style={{ color: "var(--color-espresso)", fontFamily: "monospace" }}>
            {formatTime(timeLeft)}
          </strong>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResendClick}
          disabled={isResending}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--color-espresso)",
            fontWeight: 600,
            textDecoration: "underline",
            fontSize: "13px",
            letterSpacing: "0.5px",
          }}
        >
          <RotateCw size={14} className={isResending ? "spin-icon" : ""} />
          {isResending ? "Dispatching Code..." : "Resend OTP"}
        </button>
      )}
    </div>
  );
};

export default CountdownTimer;
