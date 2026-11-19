import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { HttpError } from "./httpError.js";

// ---------------------------------------------------------------------------
// Everything that changes stock lives in THIS file, so the rules are in one place:
//   1. A stock change either fully happens or doesn't happen at all.
//   2. Stock can never go below zero (the check and the change are ONE query).
//   3. Each change happens only once per order, even if a request is retried.
// ---------------------------------------------------------------------------

export const sessionOpts = (session) => (session ? { session } : {});

// A plain local MongoDB refuses transactions. Depending on the driver version the
// refusal is worded in different ways, so we look at every place it can appear.
const isTransactionUnsupported = (err) => {
  if (!err) return false;
  const text = [err.message, err.errmsg, err.errorResponse && err.errorResponse.errmsg, err.originalError && err.originalError.message]
    .filter(Boolean)
    .join(" ");
  return (
    err.code === 20 ||
    (err.originalError && err.originalError.code === 20) ||
    err.codeName === "IllegalOperation" ||
    /replica set|Transaction numbers|retryable writes|transactions? (are|is) not supported/i.test(text)
  );
};

// Runs `work` inside a database TRANSACTION: if anything inside fails, every
// change made inside is undone. Transactions need MongoDB to run as a replica
// set (MongoDB Atlas always does). On a plain local MongoDB we fall back to
// the same steps without a transaction; the stock steps below are still
// atomic and undo themselves if something fails.
export const runAtomic = async (work) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      console.warn("MongoDB transactions are not available here (not a replica set). Using atomic updates instead.");
      return work(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
};

// Take the ordered quantities out of stock. Returns false if this order's
// stock was already deducted (a retry), true if it just did it.
export const deductStockForOrder = async (orderId, session) => {
  const opts = sessionOpts(session);

  // Step 1: "claim" the job. Only one request can flip stockDeducted false -> true.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDeducted: false, stockRestored: false },
    { $set: { stockDeducted: true } },
    { new: true, ...opts }
  );
  if (!order) return false;

  // Step 2: take the stock. The filter { stock >= quantity } plus the $inc make
  // it ONE atomic step: if someone else took the last item first, nothing
  // matches and we stop. That is how overselling is prevented.
  const done = [];
  try {
    for (const item of order.items) {
      const result = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        opts
      );
      if (result.modifiedCount !== 1) {
        throw new HttpError(409, `"${item.name}" does not have enough stock`, { code: "OUT_OF_STOCK" });
      }
      done.push(item);
    }
  } catch (err) {
    // Inside a transaction everything is undone automatically.
    // Without one, we undo by hand.
    if (!session) {
      for (const item of done) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
      }
      await Order.updateOne({ _id: orderId }, { $set: { stockDeducted: false } });
    }
    throw err;
  }
  return true;
};

// Put the stock back (cancellation or approved return). Only once per order.
export const restoreStockForOrder = async (orderId, session) => {
  const opts = sessionOpts(session);

  const order = await Order.findOneAndUpdate(
    { _id: orderId, stockDeducted: true, stockRestored: false },
    { $set: { stockRestored: true } },
    { new: true, ...opts }
  );
  if (!order) return false; // nothing was deducted, or it was already restored

  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }, opts);
  }
  return true;
};