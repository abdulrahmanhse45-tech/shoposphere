import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/uploads/products  (created automatically if missing)
export const PRODUCT_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "products");
fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILES_PER_UPLOAD = 8;

// Only these image types are accepted. The file extension is chosen from the
// type below, NEVER from the name the client sent, so a file called
// "evil.js" cannot be saved as a script.
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PRODUCT_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype];
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: MAX_FILES_PER_UPLOAD },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.mimetype]) {
      return cb(new Error("Only JPG, PNG or WEBP images are allowed"));
    }
    cb(null, true);
  },
});

// Wraps multer so that every upload problem becomes a clear 400 message
// instead of a crash. Expects the form field name "images".
export const uploadProductImages = (req, res, next) => {
  upload.array("images", MAX_FILES_PER_UPLOAD)(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `Each image must be ${MAX_FILE_SIZE_MB}MB or smaller`,
        LIMIT_FILE_COUNT: `You can upload at most ${MAX_FILES_PER_UPLOAD} images at once`,
        LIMIT_UNEXPECTED_FILE: `Send the files in a field named "images" (max ${MAX_FILES_PER_UPLOAD})`,
      };
      return res.status(400).json({ message: messages[err.code] || "Upload failed" });
    }
    return res.status(400).json({ message: err.message || "Upload failed" });
  });
};
