import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Cart, { MAX_QUANTITY_PER_ITEM } from "../models/Cart.js";
import Product from "../models/Product.js";

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Same visibility rules as the listing and cart: published, not deleted,
// in stock, and the category not deleted.
const findBuyableProduct = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    ...Product.customerVisibleFilter(),
  }).populate("category", "name isDeleted");
  if (!product || !product.category || product.category.isDeleted) return null;
  return product;
};

// What the customer sees. Prices and availability are read fresh from the
// Product records. Products that were unpublished/deleted since being saved
// are simply left out of the response (they stay saved, and reappear if the
// admin publishes them again).
const buildWishlistView = async (wishlist) => {
  const ids = wishlist ? wishlist.products : [];
  const products = await Product.find({
    _id: { $in: ids },
    ...Product.customerVisibleFilter(),
  }).populate("category", "name isDeleted");

  const byId = new Map(
    products.filter((p) => p.category && !p.category.isDeleted).map((p) => [String(p._id), p])
  );

  // Keep the order the customer saved them in (newest saved last).
  const items = ids
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((p) => ({
      _id: p._id,
      name: p.name,
      slug: p.slug,
      image: p.images[0] || null,
      price: p.price,
      discountPercentage: p.discountPercentage,
      finalPrice: p.finalPrice,
      stock: p.stock,
    }));

  return { items, count: items.length, productIds: items.map((i) => String(i._id)) };
};

// GET /api/wishlist
export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });
    res.json({ wishlist: await buildWishlistView(wishlist) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load wishlist" });
  }
};

// POST /api/wishlist/items   body: { productId }
export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const product = await findBuyableProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "This product is not available" });
    }

    // $addToSet never adds the same product twice. upsert creates the
    // wishlist the first time.
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true }
    );

    res.status(201).json({
      message: "Added to wishlist",
      wishlist: await buildWishlistView(wishlist),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to add to wishlist" });
  }
};

// DELETE /api/wishlist/items/:productId
export const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { products: productId } },
      { new: true }
    );

    res.json({
      message: "Removed from wishlist",
      wishlist: await buildWishlistView(wishlist),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove from wishlist" });
  }
};

// POST /api/wishlist/items/:productId/move-to-cart
// Adds 1 to the cart (with the same stock / maximum checks as the cart API)
// and removes the product from the wishlist.
export const moveToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist || !wishlist.products.some((id) => String(id) === productId)) {
      return res.status(404).json({ message: "Item not found in your wishlist" });
    }

    const product = await findBuyableProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "This product is not available" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existing = cart.items.find((i) => String(i.product) === String(product._id));
    const newQuantity = (existing ? existing.quantity : 0) + 1;

    if (newQuantity > MAX_QUANTITY_PER_ITEM) {
      return res
        .status(400)
        .json({ message: `You can buy at most ${MAX_QUANTITY_PER_ITEM} of one product` });
    }
    if (newQuantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} in stock` });
    }

    if (existing) existing.quantity = newQuantity;
    else cart.items.push({ product: product._id, quantity: 1 });
    await cart.save();

    wishlist.products.pull(product._id);
    await wishlist.save();

    res.json({
      message: "Moved to cart",
      wishlist: await buildWishlistView(wishlist),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to move to cart" });
  }
};
