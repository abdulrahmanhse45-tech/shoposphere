// Adds a small DEMO catalog so you can test listing, detail, cart and wishlist
// before the admin pages exist. Safe to run more than once (it skips items
// that already exist). Run from the project root:
//   node backend/scripts/seedCatalog.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/shoposphere";

await mongoose.connect(MONGO_URL);

let category = await Category.findOne({ name: "Demo Watches", isDeleted: false });
if (!category) {
  category = await Category.create({
    name: "Demo Watches",
    description: "Sample category for testing",
  });
}

const img = (seed) => [
  `https://picsum.photos/seed/${seed}-1/800/800`,
  `https://picsum.photos/seed/${seed}-2/800/800`,
  `https://picsum.photos/seed/${seed}-3/800/800`,
];

const samples = [
  {
    name: "Demo Watch Classic",
    description: "A classic analog watch with a leather strap and sapphire glass.",
    price: 4999,
    discountPercentage: 10,
    stock: 10,
    images: img("classic"),
    highlights: ["Leather strap", "Sapphire glass", "2 year warranty"],
    isPublished: true,
  },
  {
    name: "Demo Watch Sport",
    description: "A rugged sports watch, water resistant up to 100 metres.",
    price: 2999,
    discountPercentage: 0,
    stock: 25,
    images: img("sport"),
    highlights: ["Water resistant", "Shock proof"],
    isPublished: true,
  },
  {
    name: "Demo Watch Luxe",
    description: "A premium automatic watch with a stainless steel bracelet.",
    price: 15999,
    discountPercentage: 20,
    stock: 3,
    images: img("luxe"),
    highlights: ["Automatic movement", "Stainless steel"],
    isPublished: true,
  },
  {
    name: "Demo Watch Hidden (unpublished)",
    description: "This product is unpublished, so customers must never see it.",
    price: 1999,
    discountPercentage: 0,
    stock: 5,
    images: img("hidden"),
    highlights: [],
    isPublished: false,
  },
  {
    name: "Demo Watch Sold Out",
    description: "This product has zero stock, so customers must never see it.",
    price: 1999,
    discountPercentage: 0,
    stock: 0,
    images: img("soldout"),
    highlights: [],
    isPublished: true,
  },
];

for (const sample of samples) {
  const exists = await Product.findOne({ name: sample.name, isDeleted: false });
  if (exists) {
    console.log(`Skipped (already exists): ${sample.name}`);
  } else {
    await Product.create({ ...sample, category: category._id });
    console.log(`Created: ${sample.name}`);
  }
}

await mongoose.disconnect();
console.log("Done.");
