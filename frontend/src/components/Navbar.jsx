import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  MapPin,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  // The number on the bag icon comes from the real cart on the backend.
  // Admins don't shop, so they skip this.
  const refreshCartCount = useCallback(() => {
    if (!isAuthenticated || isAdmin) {
      setCartCount(0);
      return;
    }
    api
      .get("/cart")
      .then((res) => setCartCount(res.cart.itemCount))
      .catch(() => {});
  }, [isAuthenticated, isAdmin]);

  // Refresh when the page changes...
  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount, location.pathname]);

  // ...and after any successful change (api.js announces those as a success
  // toast), so adding or removing an item updates the number straight away.
  useEffect(() => {
    const onToast = (e) => {
      if (e.detail && e.detail.type === "success") refreshCartCount();
    };
    window.addEventListener("shoposphere_toast", onToast);
    return () => window.removeEventListener("shoposphere_toast", onToast);
  }, [refreshCartCount]);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, backgroundColor: "#FFFFFF" }}>
      {/* Top Announcement Bar */}
      <div
        style={{
          backgroundColor: "var(--color-espresso)",
          color: "#FAF7F5",
          padding: "7px 16px",
          textAlign: "center",
          fontSize: "11px",
          letterSpacing: "1.8px",
          textTransform: "uppercase",
          fontWeight: 400,
        }}
      >
        Complimentary White-Glove Shipping On Orders Above ₹5,000 | Bespoke Atelier Service
      </div>

      {/* Main Navbar */}
      <div
        style={{
          borderBottom: "1px solid var(--color-border)",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Left Navigation */}
        <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
          <Link
            to="/"
            style={{
              fontSize: "12px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontWeight: isActive("/") ? 600 : 400,
              color: isActive("/") ? "var(--color-espresso)" : "var(--color-text-body)",
              borderBottom: isActive("/") ? "1px solid var(--color-espresso)" : "none",
              paddingBottom: "2px",
            }}
          >
            Home
          </Link>
          <Link
            to="/products"
            style={{
              fontSize: "12px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontWeight: isActive("/products") ? 600 : 400,
              color: isActive("/products") ? "var(--color-espresso)" : "var(--color-text-body)",
              borderBottom: isActive("/products") ? "1px solid var(--color-espresso)" : "none",
              paddingBottom: "2px",
            }}
          >
            Shop
          </Link>
          <Link
            to="/#categories"
            style={{
              fontSize: "12px",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              fontWeight: 400,
              color: "var(--color-text-body)",
            }}
          >
            Categories
          </Link>

          {isAdmin && (
            <Link
              to="/admin/users"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--color-espresso)",
                backgroundColor: "var(--color-espresso-subtle)",
                padding: "4px 10px",
                borderRadius: "2px",
                border: "1px solid rgba(84, 59, 43, 0.2)",
              }}
            >
              <ShieldCheck size={13} />
              Admin Management
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/categories"
              style={{
                fontSize: "11px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontWeight: isActive("/admin/categories") ? 600 : 400,
                color: "var(--color-espresso)",
              }}
            >
              Categories
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/products"
              style={{
                fontSize: "11px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontWeight: isActive("/admin/products") ? 600 : 400,
                color: "var(--color-espresso)",
              }}
            >
              Products
            </Link>
          )}

          {isAdmin && (
            <Link
              to="/admin/orders"
              style={{
                fontSize: "11px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                fontWeight: isActive("/admin/orders") ? 600 : 400,
                color: "var(--color-espresso)",
              }}
            >
              Orders
            </Link>
          )}
        </nav>

        {/* Brand Centerpiece */}
        <div style={{ textAlign: "center" }}>
          <Link to="/" style={{ display: "inline-block" }}>
            <h1
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "24px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "var(--color-espresso)",
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              SHOPSPHERE
            </h1>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                display: "block",
              }}
            >
              Quiet Luxury Atelier
            </span>
          </Link>
        </div>

        {/* Right Navigation & User Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {/* Search Icon: opens the product listing, which has the search box */}
          <Link
            to="/products"
            title="Search Collections"
            style={{ color: "var(--color-espresso)", padding: "4px", display: "inline-flex" }}
          >
            <Search size={18} strokeWidth={1.5} />
          </Link>

          {/* Wishlist */}
          <Link
            to={isAuthenticated ? "/wishlist" : "/login"}
            title="Wishlist"
            style={{ color: "var(--color-espresso)", padding: "4px", display: "inline-flex" }}
          >
            <Heart size={18} strokeWidth={1.5} />
          </Link>

          {/* Cart */}
          <Link
            to={isAuthenticated ? "/cart" : "/login"}
            title="Shopping Bag"
            style={{
              color: "var(--color-espresso)",
              padding: "4px",
              position: "relative",
              display: "inline-flex",
            }}
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-4px",
                  backgroundColor: "var(--color-espresso)",
                  color: "#FFFFFF",
                  fontSize: "9px",
                  minWidth: "14px",
                  height: "14px",
                  padding: "0 2px",
                  borderRadius: "7px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                }}
              >
                {cartCount}
              </span>
            )}
          </Link>

          {/* User Account / Profile */}
          {isAuthenticated ? (
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 8px",
                  borderRadius: "2px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-sand)",
                }}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-espresso)",
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--color-espresso)",
                    maxWidth: "110px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.name?.split(" ")[0]}
                </span>
                <ChevronDown size={14} color="var(--color-espresso)" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    width: "220px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-md)",
                    borderRadius: "2px",
                    zIndex: 200,
                    padding: "8px 0",
                  }}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-espresso)" }}>
                      {user?.name}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {user?.email}
                    </p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-body)",
                    }}
                  >
                    <UserIcon size={14} /> Profile Overview
                  </Link>

                  <Link
                    to="/addresses"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-body)",
                    }}
                  >
                    <MapPin size={14} /> Saved Addresses
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-body)",
                    }}
                  >
                    <span style={{ width: 14, textAlign: "center" }}>#</span> My Orders
                  </Link>

                  <Link
                    to="/profile/edit"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "var(--color-text-body)",
                    }}
                  >
                    <Settings size={14} /> Edit Profile & Security
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin/users"
                      onClick={() => setDropdownOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        color: "var(--color-espresso)",
                        fontWeight: 600,
                        backgroundColor: "var(--color-sand)",
                      }}
                    >
                      <ShieldCheck size={14} /> Admin User Console
                    </Link>
                  )}

                  <div style={{ borderTop: "1px solid var(--color-border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "10px 16px",
                      fontSize: "13px",
                      color: "var(--color-danger)",
                      textAlign: "left",
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Link
                to="/login"
                className="btn-primary"
                style={{ padding: "8px 16px", fontSize: "11px" }}
              >
                Sign In
              </Link>
              <Link
                to="/admin/login"
                style={{
                  fontSize: "11px",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
                title="Admin Portal Login"
              >
                Admin
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
