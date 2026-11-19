# ShopSphere — Quiet Luxury MERN E-Commerce Atelier

> Milestone 1: Authentication, OTP Verification, User Profiles, Address Management & Admin Foundation.

---

## 🏛️ System Architecture

ShopSphere follows a clean, decoupled **MVC (Model-View-Controller)** pattern with standard Express middlewares:

```
shoposphere/
├── backend/
│   ├── models/            # Mongoose Schemas (User, Address, OTP)
│   ├── controllers/       # Business logic (Auth, Users, Addresses, Admin)
│   ├── routes/            # REST API endpoints
│   ├── middleware/        # Authentication, Authorization, Rate Limiters, Error Handlers
│   ├── utils/             # JWT generator, Nodemailer transporter with Dev OTP fallback
│   └── scripts/           # Database seeder (seedAdmin.js) & verification test suite
└── frontend/
    ├── src/
    │   ├── context/       # AuthContext with 403 Forbidden auto-logout interceptor
    │   ├── services/      # Centralized API fetch wrapper with Bearer token injection
    │   ├── components/    # Luxury Navbar, Footer, ProtectedRoute, Modal, CountdownTimer
    │   └── pages/         # Storefront, Auth, Profile, Address Management & Admin Console
```

---

## ⚡ Quick Start

### 1. Seed Database (Admin & Sample Clientele)
```bash
npm run seed
```
- **Admin**: `admin@shoposphere.com` / `Admin@123456`
- **Customer**: `elena.vance@luxury.com` / `Customer@123456`

### 2. Start Backend Server (Runs on Port 5001)
```bash
npm run backend
```
*(Port 5001 is used to avoid macOS AirPlay Receiver conflicting on port 5000).*

### 3. Start Frontend Client (Runs on Port 5173)
```bash
npm run frontend
```

### 4. Run Automated End-to-End Verification Test
```bash
npm run test:api
```
