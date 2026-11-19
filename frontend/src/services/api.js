/**
 * API Service Layer for ShopSphere
 * Encapsulates fetch requests, attaches Bearer token, and handles 403 Forbidden
 * (e.g., immediate forced logout when an admin blocks a user).
 */

// Locally this is the backend on port 5001. After hosting, set VITE_API_URL in
// Vercel to your backend address, e.g. https://shoposphere-api.onrender.com/api
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const notify = (message, type) => {
  window.dispatchEvent(
    new CustomEvent("shoposphere_toast", { detail: { message, type } })
  );
};

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem("shoposphere_token");

  // File uploads (FormData) must NOT be given a JSON content type: the browser
  // has to set its own, which includes the multipart boundary.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    // A token can expire while the app is open. Clear the saved session so a
    // protected page cannot keep showing an authenticated user after a 401.
    if (response.status === 401 && token) {
      localStorage.removeItem("shoposphere_token");
      localStorage.removeItem("shoposphere_user");
      window.dispatchEvent(
        new CustomEvent("shoposphere_session_expired", {
          detail: { message: "Your session has expired. Please sign in again." },
        })
      );
    }

    // Check for 403 Forbidden specifically due to blocked status
    if (response.status === 403 && data.message && data.message.toLowerCase().includes("blocked")) {
      // Force logout and dispatch event for AuthContext listener
      localStorage.removeItem("shoposphere_token");
      localStorage.removeItem("shoposphere_user");
      window.dispatchEvent(
        new CustomEvent("shoposphere_user_blocked", {
          detail: { message: data.message },
        })
      );
    }

    if (!response.ok) {
      notify(data.message || `Request failed with status ${response.status}`, "error");
      const error = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    if (options.method !== "GET" && data.message) {
      notify(data.message, "success");
    }

    return data;
  } catch (err) {
    throw err;
  }
};

export const api = {
  get: (endpoint, options) => request(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
  // NEW: send a file upload (FormData) instead of JSON.
  postForm: (endpoint, formData, options) =>
    request(endpoint, {
      method: "POST",
      body: formData,
      ...options,
    }),
  put: (endpoint, body, options) =>
    request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),
  patch: (endpoint, body, options) =>
    request(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),
  delete: (endpoint, options) => request(endpoint, { method: "DELETE", ...options }),
};

export default api;