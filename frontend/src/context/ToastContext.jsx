import { createContext, useContext, useEffect, useState } from "react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  useEffect(() => {
    const handleToast = (event) => {
      if (event.detail?.message) {
        showToast(event.detail.message, event.detail.type);
      }
    };
    window.addEventListener("shoposphere_toast", handleToast);
    return () => window.removeEventListener("shoposphere_toast", handleToast);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "360px",
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            style={{
              background: toast.type === "error" ? "#7F1D1D" : "#1C1917",
              color: "#FFFFFF",
              padding: "14px 38px 14px 16px",
              borderRadius: "4px",
              boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
              fontSize: "13px",
              lineHeight: 1.4,
              position: "relative",
            }}
          >
            {toast.message}
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              style={{ position: "absolute", right: "10px", top: "9px", color: "#FFFFFF", fontSize: "18px" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
