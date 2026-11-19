import React from "react";
import { X } from "lucide-react";

/**
 * Reusable Luxury Confirmation Modal
 */
const Modal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDanger = false, isLoading = false }) => {
  if (!isOpen) return null;

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E5E0D8",
          borderRadius: "2px",
          maxWidth: "460px",
          width: "100%",
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            color: "#78716C",
            padding: "4px",
          }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <h3
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            color: isDanger ? "var(--color-danger)" : "var(--color-espresso)",
            marginBottom: "12px",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-body)",
            lineHeight: "1.6",
            marginBottom: "28px",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: "10px 18px", fontSize: "12px" }}
          >
            Cancel
          </button>
          <button
            type="button"
            className={isDanger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={isLoading}
            style={{ padding: "10px 20px", fontSize: "12px" }}
          >
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
