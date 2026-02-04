import { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";

const API_URL = "http://localhost:5000";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products`);
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error("Failed to load products", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <section className="section">
      <div>
        <p className="eyebrow">Sneaker Catalog</p>
        <h1 className="section-title">New arrivals with elevated comfort.</h1>
        <p className="section-subtitle">
          Discover premium silhouettes curated for style and performance. Every
          pair is handpicked for a refined streetwear aesthetic.
        </p>
      </div>

      {isLoading ? (
        <div className="loading">Loading products...</div>
      ) : (
        <div className="grid grid-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
};

export default Home;
