import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
import Address from "../models/Address.js";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/shoposphere";

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected to MongoDB for seeding...");

    // 1. Create or ensure Admin account
    const adminEmail = "admin@shoposphere.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Admin@123456", salt);

      const adminUser = await User.create({
        name: "ShopSphere Admin Concierge",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isBlocked: false,
        phone: "+91 98765 43210",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      });

      console.log(`✅ Default Admin created: ${adminUser.email} / Admin@123456`);
    } else {
      console.log(`ℹ️ Admin already exists: ${adminEmail}`);
    }

    // 2. Ensure a sample customer exists with addresses
    const sampleCustomerEmail = "elena.vance@luxury.com";
    let customer = await User.findOne({ email: sampleCustomerEmail });

    if (!customer) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Customer@123456", salt);

      customer = await User.create({
        name: "Elena Vance",
        email: sampleCustomerEmail,
        password: hashedPassword,
        role: "customer",
        isBlocked: false,
        phone: "+91 98111 22334",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80",
      });

      console.log(`✅ Sample Customer created: ${customer.email} / Customer@123456`);

      // Add a couple sample addresses for Elena
      await Address.create([
        {
          user: customer._id,
          fullName: "Elena Vance",
          phone: "+91 98111 22334",
          streetAddress: "Penthouse 14B, Oberoi Sky Heights, Worli Sea Face",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400018",
          country: "India",
          addressType: "Home",
          isDefault: true,
        },
        {
          user: customer._id,
          fullName: "Elena Vance (Studio)",
          phone: "+91 98111 22334",
          streetAddress: "Atelier 4, Kala Ghoda Arts Precinct",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
          country: "India",
          addressType: "Work",
          isDefault: false,
        },
      ]);
      console.log(`✅ Sample Addresses added for ${customer.name}`);
    }

    // 3. Add 2 more sample customers to demonstrate admin search, pagination, and block features
    const sampleUsers = [
      {
        name: "Julian Sterling",
        email: "julian.sterling@atelier.com",
        phone: "+91 98222 33445",
        isBlocked: false,
      },
      {
        name: "Aria Montgomery",
        email: "aria.montgomery@haute.com",
        phone: "+91 98333 44556",
        isBlocked: true, // Show one pre-blocked user in admin table
      },
      {
        name: "Marcus Aurelius Vance",
        email: "marcus.vance@heritage.com",
        phone: "+91 98444 55667",
        isBlocked: false,
      },
    ];

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash("Customer@123456", salt);

    for (const u of sampleUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create({
          ...u,
          password: defaultPassword,
          role: "customer",
        });
        console.log(`✅ Seeded customer: ${u.name} (${u.email}) [Blocked: ${u.isBlocked}]`);
      }
    }

    console.log("✨ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();
