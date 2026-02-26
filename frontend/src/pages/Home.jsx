import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;
const Home = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Shoes");
  const [brandFilter, setBrandFilter] = useState("All");
  const [sortOption, setSortOption] = useState("best");
  const navigate = useNavigate();
  const [saleConfig, setSaleConfig] = useState(null);

  const normalizeCategory = (value) => {
    const trimmed = value?.trim().toLowerCase();
    if (trimmed === "bags" || trimmed === "bag") {
      return "Bags";
    }
    return "Shoes";
  };

  const brandOptions = useMemo(() => {
    const available = new Set(
      products
        .filter(
          (product) => normalizeCategory(product.category) === categoryFilter,
        )
        .map((product) => product.brand)
        .filter((brand) => typeof brand === "string" && brand.trim())
        .map((brand) => brand.trim()),
    );

    return [
      { value: "All", label: "All Brands" },
      ...Array.from(available)
        .sort()
        .map((brand) => ({ value: brand, label: brand })),
    ];
  }, [products, categoryFilter]);

  const currentSale = saleConfig?.current || saleConfig || null;
  const isSaleActive = useMemo(() => {
    if (
      !currentSale?.enabled ||
      !currentSale?.price ||
      !currentSale?.startDate ||
      !currentSale?.endDate
    ) {
      return false;
    }
    const start = new Date(`${currentSale.startDate}T00:00:00`);
    const end = new Date(`${currentSale.endDate}T23:59:59`);
    const now = new Date();
    return now >= start && now <= end;
  }, [currentSale]);

  const getEffectivePrice = (product) => {
    const originalBase = Number(product.price || product.offerPrice || 0);
    if (!isSaleActive) return Number(product.offerPrice || 0);
    return Math.max(0, originalBase - Number(currentSale.price || 0));
  };

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filteredByCategory = products.filter(
      (product) => normalizeCategory(product.category) === categoryFilter,
    );
    const filteredByBrand =
      brandFilter === "All"
        ? filteredByCategory
        : filteredByCategory.filter(
            (product) =>
              product.brand?.trim().toLowerCase() === brandFilter.toLowerCase(),
          );

    const filteredBySearch = !query
      ? filteredByBrand
      : filteredByBrand.filter((product) =>
          product.name?.toLowerCase().includes(query),
        );

    if (sortOption === "random") {
      return [...filteredBySearch].sort(() => Math.random() - 0.5);
    }

    const compareNewest = (a, b) => Number(b.id || 0) - Number(a.id || 0);
    const compareOldest = (a, b) => Number(a.id || 0) - Number(b.id || 0);
    const compareBest = (a, b) => {
      const bestDiff =
        Number(Boolean(b.isBestSeller)) - Number(Boolean(a.isBestSeller));
      if (bestDiff !== 0) return bestDiff;
      return compareNewest(a, b);
    };

    if (sortOption === "oldest") {
      return [...filteredBySearch].sort(compareOldest);
    }
    if (sortOption === "newest") {
      return [...filteredBySearch].sort(compareNewest);
    }
    if (sortOption === "price-low") {
      return [...filteredBySearch].sort(
        (a, b) => getEffectivePrice(a) - getEffectivePrice(b),
      );
    }
    if (sortOption === "price-high") {
      return [...filteredBySearch].sort(
        (a, b) => getEffectivePrice(b) - getEffectivePrice(a),
      );
    }

    return [...filteredBySearch].sort(compareBest);
  }, [
    products,
    searchTerm,
    categoryFilter,
    brandFilter,
    sortOption,
    isSaleActive,
    currentSale,
  ]);
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
  useEffect(() => {
    if (brandFilter === "All") {
      return;
    }

    const isStillAvailable = brandOptions.some(
      (option) => option.value === brandFilter,
    );
    if (!isStillAvailable) {
      setBrandFilter("All");
    }
  }, [brandOptions, brandFilter]);
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
  useEffect(() => {
  if (!isLoading) {
    const savedPosition = sessionStorage.getItem("homeScrollPosition");

    if (savedPosition) {
      window.scrollTo(0, Number(savedPosition));
      sessionStorage.removeItem("homeScrollPosition");
    }
  }
}, [isLoading]);

  const handleProductClick = (product) => {
       // Save current scroll position before navigating
    sessionStorage.setItem("homeScrollPosition", window.scrollY);
    navigate(`/products/${product.id}`);
  }
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

      {isSaleActive && (
        <div className="sale-banner">
          <div>
            <p className="sale-banner__eyebrow">Limited time offer</p>
            <h2 className="sale-banner__title">
              {currentSale?.name || "Sale"} is live
            </h2>
            {currentSale?.description && (
              <p className="sale-banner__quote">“{currentSale.description}”</p>
            )}
            <p className="sale-banner__subtitle">
              Flat ₹{Number(currentSale?.price || 0).toLocaleString("en-IN")} off
              on all products
            </p>
          </div>
          <div className="sale-banner__chip">
            Save ₹{Number(currentSale?.price || 0).toLocaleString("en-IN")}
          </div>
        </div>
      )}

      <div className="filter-media"
        style={{
          display: "flex",
          justifyContent: "end",
          gap: "12px",
          marginBlock: "20px",
        }}
      >
        {/* <h1 fontWeight={300}>All products</h1> */}
        <div className="toggle-group" role="group" aria-label="Category filter">
          {["Shoes", "Bags"].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => {
                setCategoryFilter(category);
                setBrandFilter("All");
              }}
              className={`toggle-button${
                categoryFilter === category ? " is-active" : ""
              }`}
              aria-pressed={categoryFilter === category}
            >
              {category}
            </button>
          ))}
        </div>
        <select
          value={brandFilter}
          onChange={(event) => setBrandFilter(event.target.value)}
          className="form__input"
          aria-label="Filter products by brand"
          style={{ minWidth: "180px" }}
        >
          {brandOptions.map((brand) => (
            <option key={brand.value} value={brand.value}>
              {brand.label}
            </option>
          ))}
        </select>
        <select
          value={sortOption}
          onChange={(event) => setSortOption(event.target.value)}
          className="form__input"
          aria-label="Sort products"
          style={{ minWidth: "180px" }}
        >
          <option value="best">Best sellers (default)</option>
          <option value="newest">Recently added</option>
          <option value="oldest">Older first</option>
          <option value="price-low">Price: low to high</option>
          <option value="price-high">Price: high to low</option>
          <option value="random">Random</option>
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
            <ProductCard
              key={product.id}
              product={product}
              onClick={handleProductClick}
              sale={
                isSaleActive
                  ? {
                      name: currentSale?.name || "",
                      price: currentSale?.price,
                      isActive: true,
                    }
                  : { isActive: false }
              }
            />
          ))}
        </div>
      ) : (
        <p className="helper">No products match your search.</p>
      )}
    </section>
  );
};

export default Home;
