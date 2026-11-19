// Product images are either full web links (like the demo products) or paths
// the backend saved, like "/uploads/products/abc.jpg". The saved ones live on
// the backend (port 5001), not the Vite dev server (port 5173), so they need
// the backend address put in front.
// Taken from VITE_API_URL (the same setting api.js uses) by removing the "/api" ending.
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || "http://localhost:5001/api").replace(/\/api\/?$/, "");

export const imageUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_ORIGIN}${path}`;
};

export const formatPrice = (value) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;