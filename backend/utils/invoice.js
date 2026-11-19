import PDFDocument from "pdfkit";
import { STATUS_LABELS } from "./orderStatus.js";

// "Rs." is used instead of the rupee symbol because the standard PDF fonts
// do not contain that symbol.
const money = (n) =>
  `Rs. ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Draws the invoice and sends it straight to the browser as a PDF download.
export const streamInvoice = (order, res) => {
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${order.orderNumber}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(22).fillColor("#000").text("SHOPSPHERE", 50, 50);
  doc.fontSize(10).fillColor("#666").text("Tax Invoice", 50, 78);

  doc.fillColor("#000").fontSize(10);
  const right = { width: 195, align: "right" };
  doc.text(`Order No: ${order.orderNumber}`, 350, 50, right);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 350, 66, right);
  doc.text(`Status: ${STATUS_LABELS[order.status] || order.status}`, 350, 82, right);
  doc.text(
    `Payment: ${order.paymentMethod === "COD" ? "Cash on Delivery" : "Online (Razorpay)"} - ${order.paymentStatus}`,
    300,
    98,
    { width: 245, align: "right" }
  );

  // Delivery address
  const a = order.shippingAddress;
  doc.fontSize(11).text("Delivered to", 50, 130);
  doc.fontSize(10).text(a.fullName, 50, 148);
  doc.text(a.streetAddress, 50);
  doc.text(`${a.city}, ${a.state} ${a.postalCode}`, 50);
  doc.text(a.country || "India", 50);
  doc.text(`Phone: ${a.phone}`, 50);

  // Items table
  let y = 250;
  doc.fontSize(10).fillColor("#666");
  doc.text("Item", 50, y, { width: 230 });
  doc.text("Qty", 290, y, { width: 40 });
  doc.text("Unit price", 335, y, { width: 90, align: "right" });
  doc.text("Total", 435, y, { width: 110, align: "right" });
  y += 16;
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#ccc").stroke();
  y += 8;

  doc.fillColor("#000");
  for (const item of order.items) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    const nameHeight = doc.heightOfString(item.name, { width: 230 });
    doc.text(item.name, 50, y, { width: 230 });
    doc.text(String(item.quantity), 290, y, { width: 40 });
    doc.text(money(item.unitPrice), 335, y, { width: 90, align: "right" });
    doc.text(money(item.lineTotal), 435, y, { width: 110, align: "right" });
    y += Math.max(20, nameHeight + 8);
  }

  // Totals
  if (y > 640) {
    doc.addPage();
    y = 50;
  }
  doc.moveTo(50, y).lineTo(545, y).strokeColor("#ccc").stroke();
  y += 12;

  const line = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, 300, y, { width: 130, align: "right" });
    doc.text(value, 435, y, { width: 110, align: "right" });
    y += 18;
  };
  line("Subtotal", money(order.pricing.subtotal));
  line("Shipping", order.pricing.shippingCharge === 0 ? "Free" : money(order.pricing.shippingCharge));
  line("Tax (GST)", money(order.pricing.tax));
  line("Amount payable", money(order.pricing.total), true);

  doc.font("Helvetica").fontSize(9).fillColor("#666");
  doc.text("Thank you for shopping with ShopSphere.", 50, y + 30, { width: 495, align: "center" });

  doc.end();
};