import Category from "../models/Category.js";
import Product from "../models/Product.js";

const cat = new Category({ name: "Shoes" });
await cat.validate();
console.log("Category OK:", cat.name);

const good = new Product({
  name: "Leather Bag",
  description: "A sturdy handmade leather bag.",
  price: 1000,
  discountPercentage: 20,
  category: cat._id,
  stock: 5,
});
await good.validate();
console.log("Product OK, slug:", good.slug, "| finalPrice:", good.finalPrice); // expect 800

const bad = new Product({ name: "X", price: -5, stock: 2.5, discountPercentage: 95 });
try {
  await bad.validate();
  console.log("PROBLEM: bad product passed validation");
} catch (err) {
  console.log("Bad product rejected, as expected:", Object.keys(err.errors).join(", "));
}

console.log("Visible filter:", Product.customerVisibleFilter());
process.exit(0);