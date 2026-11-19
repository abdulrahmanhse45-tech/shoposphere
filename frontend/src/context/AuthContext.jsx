import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blockedAlert, setBlockedAlert] = useState(null);
  const [sessionAlert, setSessionAlert] = useState(null);

  // Initialize auth state from localStorage on load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("shoposphere_token");
      const storedUser = localStorage.getItem("shoposphere_user");

      const payload = storedToken
        ? JSON.parse(atob(storedToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
        : null;

      if (storedToken && storedUser && payload?.exp * 1000 > Date.now()) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } else if (storedToken || storedUser) {
        localStorage.removeItem("shoposphere_token");
        localStorage.removeItem("shoposphere_user");
        setSessionAlert("Your session has expired. Please sign in again.");
      }
    } catch (err) {
      console.error("Failed to restore authentication session:", err);
      localStorage.removeItem("shoposphere_token");
      localStorage.removeItem("shoposphere_user");
    } finally {
      setLoading(false);
    }

    // Immediate forced logout listener when a 403 response arrives from backend
    const handleBlockedEvent = (e) => {
      setUser(null);
      setToken(null);
      setBlockedAlert(
        e.detail?.message ||
          "Your account has been blocked by an administrator. Please contact concierge support."
      );
    };

    const handleSessionExpired = (e) => {
      setUser(null);
      setToken(null);
      setSessionAlert(e.detail?.message || "Your session has expired. Please sign in again.");
    };

    window.addEventListener("shoposphere_user_blocked", handleBlockedEvent);
    window.addEventListener("shoposphere_session_expired", handleSessionExpired);
    return () => {
      window.removeEventListener("shoposphere_user_blocked", handleBlockedEvent);
      window.removeEventListener("shoposphere_session_expired", handleSessionExpired);
    };
  }, []);

  const login = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    setBlockedAlert(null);
    setSessionAlert(null);
    localStorage.setItem("shoposphere_token", authToken);
    localStorage.setItem("shoposphere_user", JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("shoposphere_token");
    localStorage.removeItem("shoposphere_user");
  };

  const updateUser = (updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem("shoposphere_user", JSON.stringify(merged));
      return merged;
    });
  };

  const clearBlockedAlert = () => setBlockedAlert(null);
  const clearSessionAlert = () => setSessionAlert(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        blockedAlert,
        sessionAlert,
        login,
        logout,
        updateUser,
        clearBlockedAlert,
        clearSessionAlert,
        isAdmin: user?.role === "admin",
        isAuthenticated: Boolean(token && user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
