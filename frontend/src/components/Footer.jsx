import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const Footer = () => {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-espresso)",
        color: "#FAF7F5",
        marginTop: "80px",
        padding: "60px 0 32px 0",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "40px",
            marginBottom: "50px",
          }}
        >
          {/* Brand Philosophy */}
          <div>
            <h3
              style={{
                fontFamily: "var(--font-serif)",
                color: "#FFFFFF",
                fontSize: "20px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                marginBottom: "16px",
              }}
            >
              ShopSphere
            </h3>
            <p
              style={{
                color: "#D4CDC3",
                fontSize: "13px",
                lineHeight: "1.7",
                marginBottom: "20px",
              }}
            >
              Quiet elegance rooted in artisanal craftsmanship and timeless design.
              Curating refined essentials for discerning individuals globally.
            </p>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#A8A29E",
              }}
            >
              Atelier & Concierge Mumbai
            </span>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              Collections
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Ready-to-Wear", "Fine Leathergoods", "Tailored Outerwear", "Artisanal Fragrance", "Archival Accents"].map((item) => (
                <li key={item}>
                  <Link
                    to="/"
                    style={{
                      color: "#D4CDC3",
                      fontSize: "13px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.target.style.color = "#D4CDC3")}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Client Concierge */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              Client Concierge
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
              {["Bespoke Appointments", "Care & Restoration", "Complimentary Shipping", "Returns & Exchanges", "Authentication Registry"].map((item) => (
                <li key={item}>
                  <Link
                    to="/"
                    style={{
                      color: "#D4CDC3",
                      fontSize: "13px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.target.style.color = "#FFFFFF")}
                    onMouseLeave={(e) => (e.target.style.color = "#D4CDC3")}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4
              style={{
                fontSize: "12px",
                letterSpacing: "2px",
                textTransform: "uppercase",
                color: "#FFFFFF",
                marginBottom: "16px",
                fontWeight: 600,
              }}
            >
              The Journal & Gazette
            </h4>
            <p style={{ color: "#D4CDC3", fontSize: "13px", marginBottom: "16px" }}>
              Receive exclusive invitations to private salon viewings and seasonal releases.
            </p>
            <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex" }}>
              <input
                type="email"
                placeholder="Enter your email address"
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  outline: "none",
                  borderRight: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  backgroundColor: "#FAF7F5",
                  color: "var(--color-espresso)",
                  padding: "0 16px",
                  border: "none",
                  cursor: "pointer",
                }}
                aria-label="Subscribe"
              >
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            fontSize: "11px",
            color: "#A8A29E",
          }}
        >
          <p>&copy; {new Date().getFullYear()} ShopSphere Atelier Inc. All rights reserved.</p>
          <div style={{ display: "flex", gap: "20px" }}>
            <Link to="/" style={{ color: "#A8A29E" }}>Privacy Policy</Link>
            <Link to="/" style={{ color: "#A8A29E" }}>Terms of Service</Link>
            <Link to="/admin/login" style={{ color: "#A8A29E" }}>Staff / Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
