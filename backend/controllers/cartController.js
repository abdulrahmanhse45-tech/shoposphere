import mongoose from "mongoose";
import Cart, { MAX_QUANTITY_PER_ITEM } from "../models/Cart.js";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const round2 = (n) => Math.round(n * 100) / 100;

const UNAVAILABLE = "This product is no longer available";

// Why a product cannot be bought right now (null means it is fine).
// Uses the SAME rules as the customer listing: published, not deleted, in
// stock, and its category not deleted.
const unavailableReason = (product) => {
  if (!product || product.isDeleted || !product.isPublished) return UNAVAILABLE;
  if (!product.category || product.category.isDeleted) return UNAVAILABLE;
  if (product.stock <= 0) return "Out of stock";
  return null;
};

// Fetch a product ONLY if a customer is allowed to buy it.
const findBuyableProduct = async (productId) => {
  const product = await Product.findOne({
    _id: productId,
    ...Product.customerVisibleFilter(),
  }).populate("category", "name isDeleted");
  return unavailableReason(product) ? null : product;
};

// Turns a saved cart into what the customer sees. Every price, stock figure
// and total is calculated HERE from the real Product records, never from
// anything the frontend sent or anything saved earlier.
export const buildCartView = async (cart) => {
  const items = cart ? cart.items : [];
  const products = await Product.find({
    _id: { $in: items.map((i) => i.product) },
  }).populate("category", "name isDeleted");
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let total = 0;
  const viewItems = items.map((item) => {
    const product = byId.get(String(item.product));

    let issue = unavailableReason(product);
    if (!issue && item.quantity > product.stock) {
      issue = `Only ${product.stock} left in stock`;
    }
    if (!issue && item.quantity > MAX_QUANTITY_PER_ITEM) {
      issue = `Maximum ${MAX_QUANTITY_PER_ITEM} per product`;
    }

    const valid = !issue;
    const lineTotal = valid ? round2(product.finalPrice * item.quantity) : 0;
    if (valid) total += lineTotal;

    return {
      productId: item.product,
      quantity: item.quantity,
      valid,
      issue,
      lineTotal,
      product: product
        ? {
            _id: product._id,
            name: product.name,
            slug: product.slug,
            image: product.images[0] || null,
            price: product.price,
            discountPercentage: product.discountPercentage,
            finalPrice: product.finalPrice,
            stock: product.stock,
          }
        : null,
    };
  });

  return {
    items: viewItems,
    itemCount: viewItems.reduce((sum, i) => sum + i.quantity, 0),
    total: round2(total), // only items that are currently valid are counted
    canCheckout: viewItems.length > 0 && viewItems.every((i) => i.valid),
    maxPerItem: MAX_QUANTITY_PER_ITEM,
  };
};

const parseQuantity = (value, fallback) => {
  const quantity = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) {
    return null;
  }
  return quantity;
};

// ---------------------------------------------------------------------------
// Endpoints (all need a logged-in, non-blocked customer)
// ---------------------------------------------------------------------------

// GET /api/cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    res.json({ cart: await buildCartView(cart) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load cart" });
  }
};

// POST /api/cart/items   body: { productId, quantity? }  (quantity defaults to 1)
export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }
    const quantity = parseQuantity(req.body.quantity, 1);
    if (!quantity) {
      return res
        .status(400)
        .json({ message: `Quantity must be a whole number from 1 to ${MAX_QUANTITY_PER_ITEM}` });
    }

    const product = await findBuyableProduct(productId);
    if (!product) {
      return res.status(404).json({ message: "This product is not available" });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = new Cart({ user: req.user._id, items: [] });

    const existing = cart.items.find((i) => String(i.product) === String(product._id));
    const newQuantity = (existing ? existing.quantity : 0) + quantity;

    if (newQuantity > MAX_QUANTITY_PER_ITEM) {
      return res
        .status(400)
        .json({ message: `You can buy at most ${MAX_QUANTITY_PER_ITEM} of one product` });
    }
    // Stock check uses the REAL stock from MongoDB.
    if (newQuantity > product.stock) {
      return res.status(400).json({
        message: existing
          ? `Only ${product.stock} in stock (you already have ${existing.quantity} in your cart)`
          : `Only ${product.stock} in stock`,
      });
    }

    if (existing) existing.quantity = newQuantity;
    else cart.items.push({ product: product._id, quantity });
    await cart.save();

    // Moving a wishlist item into the cart removes it from the wishlist.
    await Wishlist.updateOne({ user: req.user._id }, { $pull: { products: product._id } });

    res.status(201).json({ message: "Added to cart", cart: await buildCartView(cart) });
  } catch (error) {
    res.status(500).json({ message: "Failed to add to cart" });
  }
};

// PATCH /api/cart/items/:productId   body: { quantity }  (the NEW quantity)
export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }
    const quantity = parseQuantity(req.body.quantity, undefined);
    if (!quantity) {
      return res
        .status(400)
        .json({ message: `Quantity must be a whole number from 1 to ${MAX_QUANTITY_PER_ITEM}` });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    const item = cart && cart.items.find((i) => String(i.product) === productId);
    if (!item) return res.status(404).json({ message: "Item not found in your cart" });

    const product = await findBuyableProduct(productId);
    if (!product) {
      return res
        .status(400)
        .json({ message: "This product is no longer available. Please remove it from your cart." });
    }
    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} in stock` });
    }

    item.quantity = quantity;
    await cart.save();

    res.json({ message: "Cart updated", cart: await buildCartView(cart) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update cart" });
  }
};

// DELETE /api/cart/items/:productId
export const removeCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidId(productId)) {
      return res.status(400).json({ message: "Invalid product" });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart || !cart.items.some((i) => String(i.product) === productId)) {
      return res.status(404).json({ message: "Item not found in your cart" });
    }

    cart.items = cart.items.filter((i) => String(i.product) !== productId);
    await cart.save();

    res.json({ message: "Item removed", cart: await buildCartView(cart) });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove item" });
  }
};

// POST /api/cart/checkout-validation
// Re-checks EVERYTHING against the database right now: availability, stock,
// current prices and the total. A full payment system is not needed; this is
// the gate a checkout would call first.
export const validateCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    const view = await buildCartView(cart);

    if (view.items.length === 0) {
      return res.status(400).json({ valid: false, message: "Your cart is empty" });
    }

    if (!view.canCheckout) {
      return res.status(409).json({
        valid: false,
        message:
          "Some items in your cart are unavailable or exceed the available stock. Please fix them to continue.",
        issues: view.items
          .filter((i) => !i.valid)
          .map((i) => ({
            productId: i.productId,
            name: i.product ? i.product.name : null,
            issue: i.issue,
          })),
        cart: view,
      });
    }

    res.json({
      valid: true,
      message: "Your cart is ready for checkout",
      checkedAt: new Date().toISOString(),
      cart: view,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to validate cart" });
  }
};
