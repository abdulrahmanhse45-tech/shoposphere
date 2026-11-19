// Shipping and tax rules in ONE place, so changing them is a one-line edit.
// The server always works these out. The page never sends a total.

export const FREE_SHIPPING_THRESHOLD = 5000; // free shipping from this subtotal (matches the site banner)
export const SHIPPING_CHARGE = 99; // otherwise this flat charge
export const TAX_RATE = 0.18; // 18% GST, added on top of the item total

const round2 = (n) => Math.round(n * 100) / 100;

export const calculatePricing = (subtotal) => {
  const shippingCharge = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_CHARGE;
  const tax = round2(subtotal * TAX_RATE);
  const total = round2(subtotal + shippingCharge + tax);
  return { subtotal: round2(subtotal), shippingCharge, tax, total };
};