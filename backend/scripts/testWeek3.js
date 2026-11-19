/**
 * Automated checks for the shop features: cart, checkout, orders, stock,
 * payments, cancellation, returns and admin order management.
 *
 * It talks to the backend that is ALREADY RUNNING (npm run dev), the same way
 * the website does. Run it from the project root:
 *
 *   TEST_CUSTOMER_PASSWORD='...' TEST_ADMIN_PASSWORD='...' node backend/scripts/testWeek3.js
 *
 * Optional settings:
 *   API_URL                (default http://localhost:5001/api)
 *   TEST_CUSTOMER_EMAIL    (default elena.vance@luxury.com)
 *   TEST_ADMIN_EMAIL       (default admin@shoposphere.com)
 *
 * What it changes: it creates a few test orders (they stay in the database),
 * a temporary address (deleted at the end), and uses the stock of ONE product
 * (the stock is put back by the cancel and return tests).
 */

const API = process.env.API_URL || "http://localhost:5001/api";
const CUSTOMER_EMAIL = process.env.TEST_CUSTOMER_EMAIL || "elena.vance@luxury.com";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@shoposphere.com";
const CUSTOMER_PASSWORD = process.env.TEST_CUSTOMER_PASSWORD;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

let passed = 0;
let failed = 0;
let skipped = 0;

const call = async (method, path, token, body) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const check = (name, condition, detail = "") => {
  if (condition) {
    passed++;
    console.log(`   ✅ ${name}`);
  } else {
    failed++;
    console.log(`   ❌ ${name}${detail ? `  ->  ${detail}` : ""}`);
  }
};

const skip = (name, why) => {
  skipped++;
  console.log(`   ⏭️  ${name} (skipped: ${why})`);
};

const section = (title) => console.log(`\n${title}`);
const short = (r) => `status ${r.status}: ${r.data && r.data.message ? r.data.message : JSON.stringify(r.data).slice(0, 120)}`;

const main = async () => {
  console.log("🧪 Testing cart, checkout, orders, stock, payments and admin order management");
  console.log(`   API: ${API}\n`);

  if (!CUSTOMER_PASSWORD || !ADMIN_PASSWORD) {
    console.log("Please set TEST_CUSTOMER_PASSWORD and TEST_ADMIN_PASSWORD (see the top of this file).");
    process.exit(1);
  }

  // ---------------------------------------------------------------- setup
  section("0. Setup");
  const health = await call("GET", "/orders", null).catch(() => null);
  if (!health) {
    console.log("   ❌ Could not reach the backend. Is it running on the address above?");
    process.exit(1);
  }

  const cLogin = await call("POST", "/auth/login", null, { email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD });
  const aLogin = await call("POST", "/auth/login", null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  check("Customer can log in", !!cLogin.data.token, short(cLogin));
  check("Admin can log in", !!aLogin.data.token, short(aLogin));
  if (!cLogin.data.token || !aLogin.data.token) process.exit(1);
  const C = cLogin.data.token;
  const A = aLogin.data.token;

  // a temporary delivery address for the test orders
  const addrRes = await call("POST", "/addresses", C, {
    fullName: "Test Buyer",
    phone: "9876543210",
    streetAddress: "12 Test Street",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    addressType: "Other",
  });
  const addressId = addrRes.data.data && addrRes.data.data._id;
  check("Temporary test address created", !!addressId, short(addrRes));
  if (!addressId) process.exit(1);

  const stockOf = async (id) => {
    const r = await call("GET", `/admin/products/${id}`, A);
    return r.data.product ? r.data.product.stock : null;
  };

  const clearCart = async () => {
    const r = await call("GET", "/cart", C);
    const items = (r.data.cart && r.data.cart.items) || [];
    for (const i of items) await call("DELETE", `/cart/items/${i.productId}`, C);
  };

  // pick a product with enough stock
  const list = await call("GET", "/products?limit=50", C);
  let product = null;
  let startStock = 0;
  const seen = [];
  for (const p of list.data.products || []) {
    const id = p._id || p.id;
    const s = await stockOf(id);
    seen.push(`${p.name}: ${s}`);
    if (s !== null && s >= 3) {
      product = { id, name: p.name };
      startStock = s;
      break;
    }
  }
  check("Found a product with at least 3 in stock to test with", !!product,
    `product list answered ${list.status}, ${(list.data.products || []).length} products; stocks seen -> ${seen.join(" | ") || "none"}`);
  if (!product) {
    console.log("   Add stock (3 or more) to a published product in the admin page and run again.");
    process.exit(1);
  }
  console.log(`   Using product "${product.name}" (stock ${startStock})`);

  const newKey = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const place = (method, key = newKey()) =>
    call("POST", "/orders", C, { addressId, paymentMethod: method, idempotencyKey: key });
  const addToCart = (qty) => call("POST", "/cart/items", C, { productId: product.id, quantity: qty });

  await clearCart();

  // ------------------------------------------------------------- security
  section("1. Access control (who is allowed to do what)");
  const noToken = await call("GET", "/orders", null);
  check("Orders cannot be read without logging in (401)", noToken.status === 401, short(noToken));
  const custAdmin = await call("GET", "/admin/orders", C);
  check("A customer cannot open the admin orders list (403)", custAdmin.status === 403, short(custAdmin));
  const custAdminPatch = await call("PATCH", "/admin/orders/000000000000000000000000/status", C, { status: "shipped" });
  check("A customer cannot change an order status (403)", custAdminPatch.status === 403, short(custAdminPatch));

  // ------------------------------------------------------------- checkout
  section("2. Checkout and pricing");
  const emptySummary = await call("GET", "/orders/checkout-summary", C);
  check("Checkout with an empty cart is refused (400)", emptySummary.status === 400, short(emptySummary));

  const tooMany = await addToCart(startStock + 1 > 10 ? 11 : startStock + 1);
  check("Adding more than the stock / limit to the cart is refused (400)", tooMany.status === 400, short(tooMany));

  const add2 = await addToCart(2);
  check("Added 2 items to the cart", add2.status === 201 || add2.status === 200, short(add2));
  const summary = await call("GET", "/orders/checkout-summary", C);
  const p = summary.data.pricing || {};
  const expShip = p.subtotal >= 5000 ? 0 : 99;
  const expTax = Math.round(p.subtotal * 0.18 * 100) / 100;
  const expTotal = Math.round((p.subtotal + expShip + expTax) * 100) / 100;
  check("Shipping follows the rule (free from Rs. 5000, else Rs. 99)", p.shippingCharge === expShip, JSON.stringify(p));
  check("Tax is 18% of the subtotal", Math.abs(p.tax - expTax) < 0.011, JSON.stringify(p));
  check("Total = subtotal + shipping + tax", Math.abs(p.total - expTotal) < 0.011, JSON.stringify(p));

  // --------------------------------------------------------------- COD
  section("3. Cash on Delivery order, stock and duplicate protection");
  const key = newKey();
  const o1 = await place("COD", key);
  const order1 = o1.data.order;
  check("COD order placed (201)", o1.status === 201 && !!order1, short(o1));
  check("COD order starts as Confirmed", order1 && order1.status === "confirmed");
  check("Order has a unique order number", order1 && /^SS-\d{8}-[A-F0-9]{6}$/.test(order1.orderNumber), order1 && order1.orderNumber);
  check("Order total matches the checkout summary", order1 && Math.abs(order1.pricing.total - p.total) < 0.011);
  check("Stock went down by 2", (await stockOf(product.id)) === startStock - 2);
  const cartAfter = await call("GET", "/cart", C);
  check("Cart was emptied after the order", ((cartAfter.data.cart || {}).items || []).length === 0);

  const dup = await place("COD", key);
  check("Sending the same order again does NOT create a second order", dup.data.duplicate === true && dup.data.order && dup.data.order._id === order1._id, short(dup));
  check("...and does not take the stock twice", (await stockOf(product.id)) === startStock - 2);

  const mine = await call("GET", "/orders?limit=50", C);
  check("The order shows up in 'My orders'", (mine.data.orders || []).some((o) => o._id === order1._id));
  const found = await call("GET", `/orders?search=${order1.orderNumber}`, C);
  check("Searching by order number finds it", (found.data.orders || []).length === 1);
  const adminSeesIt = await call("GET", `/admin/orders?search=${order1.orderNumber}`, A);
  check("Admin can find it by order number", (adminSeesIt.data.orders || []).length === 1);
  const notMine = await call("GET", `/orders/${order1._id}`, A);
  check("Another account (the admin) cannot read the customer's order via the customer route (404)", notMine.status === 404, short(notMine));

  // ----------------------------------------------------------- cancel
  section("4. Cancellation (stock must come back exactly once)");
  const [cancelA, cancelB] = await Promise.all([
    call("POST", `/orders/${order1._id}/cancel`, C, { reason: "test" }),
    call("POST", `/orders/${order1._id}/cancel`, C, { reason: "test" }),
  ]);
  const codes = [cancelA.status, cancelB.status].sort();
  check("Two cancel clicks at the same moment: one works, one is refused", codes[0] === 200 && codes[1] === 409, `got ${codes}`);
  check("Stock is back to the original number (restored once, not twice)", (await stockOf(product.id)) === startStock, `stock ${await stockOf(product.id)} expected ${startStock}`);
  const cancelAgain = await call("POST", `/orders/${order1._id}/cancel`, C, {});
  check("Cancelling again later is refused (409)", cancelAgain.status === 409, short(cancelAgain));

  // -------------------------------------------------- admin transitions
  section("5. Admin status changes (only allowed steps)");
  await addToCart(1);
  const o2 = await place("COD");
  const order2 = o2.data.order;
  check("Second COD order placed", !!order2, short(o2));
  if (order2) {
    const bad = await call("PATCH", `/admin/orders/${order2._id}/status`, A, { status: "delivered" });
    check("Jumping Confirmed -> Delivered is refused (400)", bad.status === 400, short(bad));
    for (const next of ["shipped", "out_for_delivery", "delivered"]) {
      const r = await call("PATCH", `/admin/orders/${order2._id}/status`, A, { status: next });
      check(`Admin moves the order to ${next}`, r.status === 200, short(r));
    }
    const back = await call("PATCH", `/admin/orders/${order2._id}/status`, A, { status: "shipped" });
    check("Going backwards (Delivered -> Shipped) is refused (400)", back.status === 400, short(back));
    const full = await call("GET", `/admin/orders/${order2._id}`, A);
    check("A COD order becomes Paid once delivered", full.data.order && full.data.order.paymentStatus === "paid");
    const cancelDelivered = await call("POST", `/orders/${order2._id}/cancel`, C, {});
    check("A delivered order cannot be cancelled (409)", cancelDelivered.status === 409, short(cancelDelivered));

    // ------------------------------------------------------------ return
    section("6. Returns");
    const stockBeforeReturn = await stockOf(product.id);
    const noReason = await call("POST", `/orders/${order2._id}/return`, C, { reason: "" });
    check("A return without a reason is refused (400)", noReason.status === 400, short(noReason));
    const ret = await call("POST", `/orders/${order2._id}/return`, C, { reason: "Item arrived damaged" });
    check("A return with a reason is accepted", ret.status === 200, short(ret));
    const ret2 = await call("POST", `/orders/${order2._id}/return`, C, { reason: "Trying again" });
    check("A second return request is refused (409)", ret2.status === 409, short(ret2));
    const approve = await call("PATCH", `/admin/orders/${order2._id}/return`, A, { action: "approve" });
    check("Admin approves the return", approve.status === 200, short(approve));
    check("Stock goes back up after an approved return", (await stockOf(product.id)) === stockBeforeReturn + 1);
    const approve2 = await call("PATCH", `/admin/orders/${order2._id}/return`, A, { action: "approve" });
    check("Approving the same return twice is refused (409)", approve2.status === 409, short(approve2));
  }

  // ------------------------------------------------- admin list controls
  section("7. Admin list: filter, sort, paginate");
  const byStatus = await call("GET", "/admin/orders?status=delivered&limit=5", A);
  check("Filtering by status only returns that status", (byStatus.data.orders || []).every((o) => o.status === "delivered"));
  const newest = await call("GET", "/admin/orders?sort=newest&limit=10", A);
  const dates = (newest.data.orders || []).map((o) => new Date(o.createdAt).getTime());
  check("Newest first is really newest first", dates.every((d, i) => i === 0 || dates[i - 1] >= d));
  const pg = await call("GET", "/admin/orders?limit=1&page=1", A);
  check("Pagination returns the page size asked for", (pg.data.orders || []).length <= 1 && pg.data.limit === 1);
  const badSort = await call("GET", "/admin/orders?sort=hacker", A);
  check("An invalid sort option is refused (400)", badSort.status === 400, short(badSort));

  // ------------------------------------------------------ online payment
  section("8. Online payment (simulated payments only)");
  await clearCart();
  await addToCart(1);
  const stockBeforeOnline = await stockOf(product.id);
  const o3 = await place("RAZORPAY");
  const order3 = o3.data.order;
  const pay = o3.data.payment;
  if (!order3 || !pay || !pay.mock) {
    skip("Online payment tests", "MOCK_PAYMENTS=true is not set on the backend (or real Razorpay keys are in use)");
    if (order3) await call("POST", `/orders/${order3._id}/cancel`, C, {});
  } else {
    check("Online order starts as Pending", order3.status === "pending");
    check("Stock is NOT taken before payment", (await stockOf(product.id)) === stockBeforeOnline);

    const badVerify = await call("POST", "/payments/verify", C, {
      orderId: order3._id,
      razorpay_order_id: pay.orderId,
      razorpay_payment_id: "fake_payment",
      razorpay_signature: "fake",
    });
    check("A fake payment proof is rejected (400)", badVerify.status === 400, short(badVerify));
    const stillPending = await call("GET", `/orders/${order3._id}`, C);
    check("...and the order stays Pending", stillPending.data.order.status === "pending");

    const failedReport = await call("POST", `/payments/${order3._id}/failed`, C, { reason: "test failure" });
    check("A failed payment is recorded", failedReport.status === 200, short(failedReport));
    const afterFail = await call("GET", `/orders/${order3._id}`, C);
    check("Order shows the payment as failed and allows a retry", afterFail.data.order.paymentStatus === "failed" && afterFail.data.order.canRetryPayment === true);

    const retry = await call("POST", `/payments/${order3._id}/razorpay-order`, C);
    check("Retry starts a new payment on the SAME order", retry.status === 200 && retry.data.payment && retry.data.payment.orderId !== pay.orderId, short(retry));
    const afterRetryList = await call("GET", `/orders?search=${order3.orderNumber}`, C);
    check("Retrying did not create a duplicate order", (afterRetryList.data.orders || []).length === 1);

    const okVerify = await call("POST", "/payments/verify", C, {
      orderId: order3._id,
      razorpay_order_id: retry.data.payment.orderId,
      razorpay_payment_id: "mock_pay_testrun01",
      razorpay_signature: "mock",
    });
    check("A valid payment is verified", okVerify.status === 200, short(okVerify));
    const paid = await call("GET", `/orders/${order3._id}`, C);
    check("Order becomes Confirmed and Paid", paid.data.order.status === "confirmed" && paid.data.order.paymentStatus === "paid");
    check("Stock is taken after payment", (await stockOf(product.id)) === stockBeforeOnline - 1);

    const verifyTwice = await call("POST", "/payments/verify", C, {
      orderId: order3._id,
      razorpay_order_id: retry.data.payment.orderId,
      razorpay_payment_id: "mock_pay_testrun01",
      razorpay_signature: "mock",
    });
    check("Verifying the same payment twice is harmless", verifyTwice.status === 200, short(verifyTwice));
    check("...and does not take the stock twice", (await stockOf(product.id)) === stockBeforeOnline - 1);

    const cancelPaid = await call("POST", `/orders/${order3._id}/cancel`, C, { reason: "test refund" });
    check("A paid online order can be cancelled", cancelPaid.status === 200, short(cancelPaid));
    check("Its payment is marked Refunded", cancelPaid.data.order && cancelPaid.data.order.paymentStatus === "refunded");
    check("Stock is restored after the refund", (await stockOf(product.id)) === stockBeforeOnline);
  }

  // -------------------------------------------------------------- cleanup
  section("Clean-up");
  await clearCart();
  await call("DELETE", `/addresses/${addressId}`, C);
  console.log("   Test cart emptied and temporary address deleted. (Test orders stay in the database.)");

  console.log(`\n${failed === 0 ? "✨" : "⚠️"} Result: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed === 0 ? 0 : 1);
};

main().catch((err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});