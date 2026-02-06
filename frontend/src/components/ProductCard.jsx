import { Link } from "react-router-dom";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

const ProductCard = ({ product }) => {
  return (
    <Link to={`/products/${product.id}`} className="card">
      <div className="card__media">
        {product.isBestSeller && (
          <span className="card__badge" aria-label="Best seller">
            ★ Best seller
          </span>
        )}
        <img
          src={product.images?.[0]}
          alt={product.name}
          loading="lazy"
        />
      </div>
      <div className="card__body">
        <div>
          <p className="eyebrow">Sneaker</p>
          <h3 className="card__title">{product.name}</h3>
        </div>
        <div className="card__price">
          <span>{formatPrice(product.offerPrice)}</span>
          {product.price && product.price !== product.offerPrice && (
            <span className="price--strike">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
