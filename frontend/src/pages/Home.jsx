import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";

const API_URL = import.meta.env.VITE_API_URL;
const Home = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");

  const brandOptions = useMemo(() => {
    const available = new Set(
      products
        .map((product) => product.brand)
        .filter((brand) => typeof brand === "string" && brand.trim())
        .map((brand) => brand.trim()),
    );

    return ["All", ...Array.from(available).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filteredByBrand =
      brandFilter === "All"
        ? products
        : products.filter(
            (product) =>
              product.brand?.trim().toLowerCase() === brandFilter.toLowerCase(),
          );

    if (!query) return filteredByBrand;
    return filteredByBrand.filter((product) =>
      product.name?.toLowerCase().includes(query),
    );
  }, [products, searchTerm, brandFilter]);

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

      <div
        style={{
          display: "flex",
          justifyContent: "end",
          gap: "12px",
          marginBlock: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* <h1 fontWeight={300}>All products</h1> */}
        <select
          value={brandFilter}
          onChange={(event) => setBrandFilter(event.target.value)}
          className="form__input"
          aria-label="Filter products by brand"
          style={{ minWidth: "180px" }}
        >
          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="form__input"
          placeholder="Search by name..."
          style={{ minWidth: "180px" }}
          aria-label="Search products by name"
        />
      </div>

      {isLoading ? (
        <div className="loading">Loading products...</div>
      ) : filteredProducts.length ? (
        <div className="grid grid-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="helper">No products match your search.</p>
      )}
    </section>
  );
};

export default Home;
