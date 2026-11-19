import React from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

const AlertBanner = ({ type = "error", message, onClose }) => {
  if (!message) return null;

  const styles = {
    error: {
      bg: "var(--color-danger-bg)",
      border: "rgba(140, 44, 40, 0.2)",
      text: "var(--color-danger)",
      Icon: AlertCircle,
    },
    success: {
      bg: "var(--color-success-bg)",
      border: "rgba(46, 90, 54, 0.2)",
      text: "var(--color-success)",
      Icon: CheckCircle,
    },
    info: {
      bg: "var(--color-sand)",
      border: "var(--color-border)",
      text: "var(--color-espresso)",
      Icon: Info,
    },
  };

  const current = styles[type] || styles.error;
  const IconComponent = current.Icon;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        borderRadius: "2px",
        color: current.text,
        fontSize: "13px",
        marginBottom: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <IconComponent size={18} style={{ flexShrink: 0 }} />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            color: current.text,
            opacity: 0.7,
            padding: "2px",
          }}
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};

export default AlertBanner;
