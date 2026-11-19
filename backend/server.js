import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import adminProductRoutes from "./routes/adminProductRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";

// Middleware imports
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

// Load environment variables
dotenv.config();

// __dirname does not exist in ES modules, so we rebuild it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

/**
 * 1. Global Middlewares
 * - CORS: Enables secure cross-origin communication between React Vite frontend & Express backend
 * - Express JSON: Parses incoming JSON request payloads
 */
// Which websites may call this API. Locally that is the Vite dev server. After
// hosting, set CLIENT_URL in the host's settings to your frontend address, e.g.
// CLIENT_URL=https://shoposphere.vercel.app  (several addresses: separate with commas).
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Serve uploaded product images, e.g. http://localhost:5001/uploads/products/abc.jpg
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/**
 * 2. API Routes Mounting
 */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShopSphere API is operating normally.",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/addresses", addressRoutes);

// The more specific /api/admin/... routes must come BEFORE the general /api/admin one.
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", adminProductRoutes);
app.use("/api/admin/uploads", uploadRoutes);
app.use("/api/admin/orders", adminOrderRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);

// Base route test
app.get("/", (req, res) => {
  res.send("ShopSphere Luxury E-Commerce API is running.");
});

/**
 * 3. Error Handling Middlewares
 * Must be mounted AFTER all route handlers
 */
app.use(notFound);
app.use(errorHandler);

/**
 * 4. Database Connection & Server Initialization
 */
const PORT = process.env.PORT || 5000;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/shoposphere";

mongoose
  .connect(MONGO_URL)
  .then(() => {
    console.log("✨ MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`🚀 ShopSphere Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

export default app;