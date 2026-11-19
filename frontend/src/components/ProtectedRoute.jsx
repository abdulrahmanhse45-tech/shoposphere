import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Route Guard Component
 * Ensures authenticated access and role verification (Admin vs Customer).
 */
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, token, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "var(--color-espresso)",
          fontSize: "14px",
          letterSpacing: "1px",
        }}
      >
        LOADING SHOPSPHERE ATELIER...
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return (
      <Navigate
        to={adminOnly ? "/admin/login" : "/login"}
        state={{ from: location }}
        replace
      />
    );
  }

  // Immediate block enforcement
  if (user.isBlocked) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only route guard
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
