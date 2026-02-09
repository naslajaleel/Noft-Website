import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ImageCarousel from "../components/ImageCarousel.jsx";

const API_URL = import.meta.env.VITE_API_URL;
const WHATSAPP_BASE = "https://wa.me/917907607583";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const SIZE_OPTIONS = Array.from({ length: 10 }, (_, idx) => 36 + idx);

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saleConfig, setSaleConfig] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`${API_URL}/products/${id}`);
        const data = await response.json();
        setProduct(data);
      } catch (error) {
        console.error("Failed to load product", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    const loadSale = async () => {
      try {
        const response = await fetch(`${API_URL}/sale`);
        const data = await response.json();
        setSaleConfig(data);
      } catch (error) {
        console.error("Failed to load sale config", error);
      }
    };

    loadSale();
  }, []);

  if (isLoading) {
    return <div className="loading">Loading product...</div>;
  }

  if (!product?.id) {
    return (
      <div className="section">
        <p className="helper">Product not found.</p>
        <Link to="/" className="button button--outline">
          Back to catalog
        </Link>
      </div>
    );
  }

  const whatsappLink = `${WHATSAPP_BASE}?text=${encodeURIComponent(
    `Hi! I'm interested in this product: ${window.location.href}`
  )}`;

  const currentSale = saleConfig?.current || saleConfig || null;
  const isSaleActive =
    Boolean(
      currentSale?.enabled &&
        currentSale?.price &&
        currentSale?.startDate &&
        currentSale?.endDate,
    ) &&
    new Date() >= new Date(`${currentSale.startDate}T00:00:00`) &&
    new Date() <= new Date(`${currentSale.endDate}T23:59:59`);

  const originalBase = Number(product.price || product.offerPrice || 0);
  const discount = isSaleActive ? Number(currentSale.price || 0) : 0;
  const effectivePrice = isSaleActive
    ? Math.max(0, originalBase - discount)
    : Number(product.offerPrice || 0);
  const showSaleStrike = isSaleActive && discount > 0 && originalBase > 0;

  return (
    <section className="layout-split">
      <ImageCarousel images={product.images} />

      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <p className="eyebrow">Limited release</p>
          <h1 className="section-title">{product.name}</h1>
          {isSaleActive && (
            <p className="helper" style={{ color: "#ef4444", fontWeight: 600 }}>
              {currentSale?.name || "Sale"} is live
            </p>
          )}
          <p className="section-subtitle">{product.description}</p>
        </div>

        <div className="badge-box">
          <p className="eyebrow">Offer price</p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="section-title" style={{ fontSize: "28px" }}>
              {formatPrice(effectivePrice)}
            </span>
            {showSaleStrike ? (
              <span className="price--strike">
              {formatPrice(originalBase)}
              </span>
            ) : (
              product.price &&
              product.price !== product.offerPrice && (
              <span className="price--strike">
                {formatPrice(product.price)}
              </span>
              )
            )}
          </div>
        </div>

        {product.brand && (
          <div>
            <p className="eyebrow">Brand</p>
            <p className="section-subtitle">{product.brand}</p>
          </div>
        )}

        <div>
          <p className="eyebrow">Sizes</p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {SIZE_OPTIONS.map((size) => {
              const isAvailable = product.sizes?.includes(size);
              return (
                <span
                  key={size}
                  style={{
                    position: "relative",
                    border: "1px solid #e5e7eb",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    fontSize: "14px",
                    background: isAvailable ? "#111827" : "#f8fafc",
                    color: isAvailable ? "#ffffff" : "#9ca3af",
                    textDecoration: isAvailable ? "none" : "line-through",
                    textDecorationColor: "#9ca3af",
                  }}
                >
                  {size}
                </span>
              );
            })}
          </div>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="button button--primary whatsapp"
        >
          Chat on WhatsApp
        </a>
      </div>
    </section>
  );
};

export default ProductDetails;
