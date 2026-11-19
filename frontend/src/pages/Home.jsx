import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Sparkles, Truck, Clock } from "lucide-react";

const Home = () => {
  const categories = [
    {
      title: "Ready-to-Wear",
      desc: "Tailored silhouettes in organic linen and virgin cashmere",
      img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Fine Leathergoods",
      desc: "Handcrafted Tuscan calfskin totes and structured briefcases",
      img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&auto=format&fit=crop&q=80",
    },
    {
      title: "Timeless Accents",
      desc: "Architectural jewelry and minimalist Swiss chronographs",
      img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    },
  ];

  const curatedPieces = [
    {
      name: "The Atelier Wool Trench",
      category: "Outerwear",
      price: "₹34,500",
      img: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Siena Calfskin Weekender",
      category: "Travel & Luggage",
      price: "₹48,000",
      img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Monochrome Cashmere Knit",
      category: "Knitwear",
      price: "₹18,500",
      img: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&auto=format&fit=crop&q=80",
    },
    {
      name: "Minimalist Brass Signet",
      category: "Jewelry",
      price: "₹12,200",
      img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    },
  ];

  const pillars = [
    {
      icon: Sparkles,
      title: "Artisanal Integrity",
      desc: "Each creation is painstakingly crafted by master heritage artisans across Italy and India.",
    },
    {
      icon: Truck,
      title: "White-Glove Delivery",
      desc: "Complimentary express courier service with signature luxury packaging and insured transit.",
    },
    {
      icon: Shield,
      title: "Certified Provenance",
      desc: "Every archival piece is cataloged with an immutable certificate of authenticity.",
    },
    {
      icon: Clock,
      title: "Private Concierge",
      desc: "Dedicated personal styling advisors available 24/7 for bespoke sizing and wardrobe curation.",
    },
  ];

  return (
    <div>
      {/* Editorial Hero Section */}
      <section
        style={{
          position: "relative",
          minHeight: "78vh",
          backgroundColor: "#ECE6DE",
          backgroundImage:
            "linear-gradient(rgba(84, 59, 43, 0.25), rgba(84, 59, 43, 0.45)), url('https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="container" style={{ width: "100%" }}>
          <div style={{ maxWidth: "580px", color: "#FFFFFF", padding: "40px 0" }}>
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "3px",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "#FAF7F5",
                display: "inline-block",
                marginBottom: "16px",
                backgroundColor: "rgba(84, 59, 43, 0.7)",
                padding: "6px 14px",
                borderRadius: "2px",
              }}
            >
              Autunno / Inverno 2026 Collection
            </span>
            <h1
              style={{
                fontSize: "52px",
                lineHeight: "1.15",
                fontWeight: 400,
                color: "#FFFFFF",
                marginBottom: "20px",
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              Quiet Splendor, <br />
              <em>Uncompromised Grace.</em>
            </h1>
            <p
              style={{
                fontSize: "16px",
                lineHeight: "1.7",
                color: "#F8F6F2",
                marginBottom: "36px",
                textShadow: "0 1px 4px rgba(0,0,0,0.3)",
              }}
            >
              Discover wardrobe foundations engineered for permanence. Hand-finished
              materials, sculpted neutral palettes, and architectural cuts.
            </p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <Link to="/#shop" className="btn-primary" style={{ padding: "14px 28px" }}>
                Explore Collection <ArrowRight size={16} />
              </Link>
              <Link
                to="/register"
                className="btn-secondary"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  borderColor: "#FFFFFF",
                  color: "var(--color-espresso)",
                  padding: "14px 28px",
                }}
              >
                Join Atelier Society
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Categories */}
      <section id="categories" style={{ padding: "80px 0" }}>
        <div className="container">
          <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 48px auto" }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              The Curated Catalog
            </span>
            <h2 style={{ fontSize: "32px", color: "var(--color-espresso)" }}>
              Disciplined Aesthetics
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "28px",
            }}
          >
            {categories.map((cat) => (
              <div
                key={cat.title}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
              >
                <div style={{ height: "340px", overflow: "hidden" }}>
                  <img
                    src={cat.img}
                    alt={cat.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.5s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "scale(1.04)")}
                    onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                  />
                </div>
                <div style={{ padding: "24px" }}>
                  <h3 style={{ fontSize: "20px", marginBottom: "8px" }}>{cat.title}</h3>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
                    {cat.desc}
                  </p>
                  <Link
                    to="/#shop"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "12px",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      color: "var(--color-espresso)",
                      fontWeight: 600,
                    }}
                  >
                    View Pieces <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Pieces */}
      <section
        id="shop"
        style={{
          padding: "80px 0",
          backgroundColor: "var(--color-alabaster)",
          borderTop: "1px solid var(--color-border)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: "40px",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "11px",
                  letterSpacing: "2.5px",
                  textTransform: "uppercase",
                  color: "var(--color-text-muted)",
                }}
              >
                Archival Highlights
              </span>
              <h2 style={{ fontSize: "32px", color: "var(--color-espresso)", marginTop: "4px" }}>
                Seasonal Essentials
              </h2>
            </div>
            <Link
              to="/#shop"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "var(--color-espresso)",
                fontWeight: 600,
              }}
            >
              Browse Full Catalog <ArrowRight size={14} />
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "24px",
            }}
          >
            {curatedPieces.map((piece) => (
              <div
                key={piece.name}
                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid var(--color-border)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "300px", overflow: "hidden" }}>
                  <img
                    src={piece.img}
                    alt={piece.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
                <div style={{ padding: "18px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: "var(--color-text-muted)",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {piece.category}
                  </span>
                  <h4 style={{ fontSize: "16px", marginBottom: "6px" }}>{piece.name}</h4>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--color-espresso)",
                    }}
                  >
                    {piece.price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Pillars */}
      <section style={{ padding: "80px 0" }}>
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "36px",
            }}
          >
            {pillars.map((pillar) => {
              const IconComp = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "#FFFFFF",
                    borderRadius: "2px",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "48px",
                      height: "48px",
                      backgroundColor: "var(--color-sand)",
                      color: "var(--color-espresso)",
                      borderRadius: "50%",
                      marginBottom: "16px",
                    }}
                  >
                    <IconComp size={22} />
                  </div>
                  <h3
                    style={{
                      fontSize: "16px",
                      letterSpacing: "1px",
                      marginBottom: "10px",
                      color: "var(--color-espresso)",
                    }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--color-text-muted)",
                      lineHeight: "1.6",
                    }}
                  >
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
