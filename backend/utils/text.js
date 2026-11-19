import mongoose from "mongoose";

// Escape user text so characters like ( or * can't break a search pattern.
export const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);