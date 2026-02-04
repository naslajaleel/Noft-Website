import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ImageCarousel from "../components/ImageCarousel.jsx";

const API_URL = import.meta.env.VITE_API_URL 
const WHATSAPP_LINK = "https://wa.me/917907607583";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <section className="layout-split">
      <ImageCarousel images={product.images} />

      <div style={{ display: "grid", gap: "24px" }}>
        <div>
          <p className="eyebrow">Limited release</p>
          <h1 className="section-title">{product.name}</h1>
          <p className="section-subtitle">{product.description}</p>
        </div>

        <div className="badge-box">
          <p className="eyebrow">Offer price</p>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <span className="section-title" style={{ fontSize: "28px" }}>
              {formatPrice(product.offerPrice)}
            </span>
            {product.price && product.price !== product.offerPrice && (
              <span className="price--strike">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>

        <a
          href={WHATSAPP_LINK}
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
