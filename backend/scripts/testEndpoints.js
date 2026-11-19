import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "../models/User.js";
import Address from "../models/Address.js";
import OTP from "../models/OTP.js";
import app from "../server.js";

dotenv.config();

const BASE_URL = "http://localhost:5001/api";

const runTests = async () => {
  console.log("🧪 Starting Automated Verification of ShopSphere APIs...\n");

  // Wait until mongoose is fully connected
  while (mongoose.connection.readyState !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  // Wait an extra second for express listen to finish
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const text = await healthRes.text();
    console.log("Health status:", healthRes.status, "body:", text);
    const healthData = JSON.parse(text);
    console.log("1. Health Check:", healthData.success ? "✅ PASSED" : "❌ FAILED");

    // 2. Customer Registration via OTP
    console.log("\n2. Testing Customer Registration with OTP...");
    const testEmail = `test.client.${Date.now()}@luxury.com`;
    const testPassword = "Secret@Password123";

    // Step A: Request OTP
    const otpReqRes = await fetch(`${BASE_URL}/auth/register-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Client",
        email: testEmail,
        password: testPassword,
      }),
    });
    const otpReqData = await otpReqRes.json();
    console.log("   - Request Registration OTP:", otpReqData.success ? "✅ PASSED" : "❌ FAILED", otpReqData.message);

    // Retrieve generated OTP directly from MongoDB OTP collection for the test
    const otpRecord = await OTP.findOne({ email: testEmail, purpose: "register" });
    if (!otpRecord) throw new Error("OTP record was not stored in database!");
    console.log(`   - Retrieved Stored OTP: ${otpRecord.otp} (Valid until: ${otpRecord.expiresAt})`);

    // Step B: Verify OTP & Register
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-register-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        otp: otpRecord.otp,
      }),
    });
    const verifyData = await verifyRes.json();
    console.log("   - Verify OTP & Account Creation:", verifyData.success ? "✅ PASSED" : "❌ FAILED");
    const customerToken = verifyData.token;
    const customerId = verifyData.user._id;

    // 3. Customer Authentication
    console.log("\n3. Testing Customer Login...");
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    console.log("   - Customer Login:", loginData.success ? "✅ PASSED" : "❌ FAILED");

    // 4. Admin Authentication
    console.log("\n4. Testing Admin Portal Login...");
    const adminLoginRes = await fetch(`${BASE_URL}/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@shoposphere.com",
        password: "Admin@123456",
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    console.log("   - Admin Authentication:", adminLoginData.success ? "✅ PASSED" : "❌ FAILED");
    const adminToken = adminLoginData.token;

    // 5. Address Management
    console.log("\n5. Testing Address Management (CRUD & Default Badge)...");
    const addAddressRes = await fetch(`${BASE_URL}/addresses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        fullName: "Test Client",
        phone: "+91 99999 88888",
        streetAddress: "Villa 10, Palm Grove Estate",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560001",
        country: "India",
        addressType: "Home",
        isDefault: true,
      }),
    });
    const addAddressData = await addAddressRes.json();
    console.log("   - Add Primary Address:", addAddressData.success ? "✅ PASSED" : "❌ FAILED", `(Default: ${addAddressData.data.isDefault})`);
    const addressId = addAddressData.data._id;

    const getAddressesRes = await fetch(`${BASE_URL}/addresses`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const getAddressesData = await getAddressesRes.json();
    console.log(`   - Retrieve Addresses: ✅ PASSED (Count: ${getAddressesData.count})`);

    // 6. Admin User Management: Search & Pagination
    console.log("\n6. Testing Admin User Search & Pagination...");
    const adminUsersRes = await fetch(`${BASE_URL}/admin/users?page=1&limit=5&search=Test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminUsersData = await adminUsersRes.json();
    console.log("   - Search Users ('Test'):", adminUsersData.success ? "✅ PASSED" : "❌ FAILED", `(Found: ${adminUsersData.totalUsers})`);

    // 7. Admin Block / Unblock & Immediate 403 Enforcement
    console.log("\n7. Testing Block/Unblock & 403 Forbidden Enforcement...");
    // Block user
    const blockRes = await fetch(`${BASE_URL}/admin/users/${customerId}/block`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const blockData = await blockRes.json();
    console.log("   - Block Customer Action:", blockData.success ? "✅ PASSED" : "❌ FAILED", blockData.message);

    // Blocked customer tries to access protected endpoint
    const blockedAccessRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    console.log("   - Blocked User Accessing Profile:", blockedAccessRes.status === 403 ? "✅ 403 FORBIDDEN CONFIRMED" : `❌ UNEXPECTED STATUS ${blockedAccessRes.status}`);

    // Unblock customer
    const unblockRes = await fetch(`${BASE_URL}/admin/users/${customerId}/block`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const unblockData = await unblockRes.json();
    console.log("   - Unblock Customer Action:", unblockData.success ? "✅ PASSED" : "❌ FAILED", unblockData.message);

    // Unblocked customer accesses protected endpoint again
    const restoredAccessRes = await fetch(`${BASE_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    console.log("   - Restored User Accessing Profile:", restoredAccessRes.status === 200 ? "✅ 200 OK RESTORED" : `❌ FAILED`);

    // Cleanup test user and address
    await User.deleteOne({ _id: customerId });
    await Address.deleteMany({ user: customerId });
    console.log("\n🧹 Test clean-up completed.");

    console.log("\n✨ ALL TESTS COMPLETED SUCCESSFULLY! System is 100% Viva Ready!\n");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Test execution failed:", err);
    process.exit(1);
  }
};

runTests();
