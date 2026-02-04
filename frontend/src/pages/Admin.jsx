import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthHeader } from "../utils/auth.js";

const API_URL = "https://noft-backend.vercel.app";

const emptyForm = {
  id: null,
  name: "",
  description: "",
  price: "",
  offerPrice: "",
  images: [""],
};

const extractDriveId = (url) => {
  if (!url) return null;
  const match =
    url.match(/\/file\/d\/([^/]+)/) ||
    url.match(/\/thumbnail\/([^/]+)/) ||
    url.match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
};

const normalizeImageUrl = (url) => {
  const trimmed = url?.trim();
  if (!trimmed) return "";
  const driveId = extractDriveId(trimmed);
  // googleusercontent.com works reliably for public Drive images
  return driveId
    ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`
    : trimmed;
};

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

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

  useEffect(() => {
    loadProducts();
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateImage = (index, value) => {
    setForm((prev) => {
      const updated = [...prev.images];
      updated[index] = value;
      return { ...prev, images: updated };
    });
  };

  const addImageField = () => {
    setForm((prev) => ({ ...prev, images: [...prev.images, ""] }));
  };

  const removeImageField = (index) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index),
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const handleEdit = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      offerPrice: product.offerPrice,
      images: product.images?.length ? product.images : [""],
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) {
      return;
    }

    try {
      await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });
      await loadProducts();
    } catch (error) {
      console.error("Failed to delete product", error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      offerPrice: Number(form.offerPrice),
      images: form.images
        .map((img) => normalizeImageUrl(img))
        .filter(Boolean),
    };

    try {
      if (isEditing) {
        await fetch(`${API_URL}/products/${form.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${API_URL}/products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(payload),
        });
      }

      await loadProducts();
      resetForm();
    } catch (error) {
      console.error("Failed to save product", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="section">
      <div>
        <p className="eyebrow">Admin</p>
        <h1 className="section-title">Product management</h1>
        <p className="section-subtitle">
          Add, edit, and curate the sneaker lineup.
        </p>
      </div>

      <div className="layout-split">
        <form onSubmit={handleSubmit} className="form">
          <div className="form__title">
            <h2>{isEditing ? "Edit product" : "Add new product"}</h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="button button--outline"
              >
                Cancel edit
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              clearAuthToken();
              navigate("/admin/login", { replace: true });
            }}
            className="button button--outline"
            style={{ justifySelf: "flex-start" }}
          >
            Logout
          </button>

          <label className="form__label">
            Name
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              className="form__input"
              placeholder="Sneaker name"
              required
            />
          </label>

          <label className="form__label">
            Description
            <textarea
              rows="3"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              className="form__textarea"
              placeholder="Short product description"
            />
          </label>

          <div className="form__row">
            <label className="form__label">
              Original price
              <input
                type="number"
                value={form.price}
                onChange={(event) => updateField("price", event.target.value)}
                className="form__input"
                placeholder="12999"
              />
            </label>
            <label className="form__label">
              Offer price
              <input
                type="number"
                value={form.offerPrice}
                onChange={(event) => updateField("offerPrice", event.target.value)}
                className="form__input"
                placeholder="9999"
                required
              />
            </label>
          </div>

          <div className="image-list">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <p className="eyebrow">Image URLs</p>
              <button
                type="button"
                onClick={addImageField}
                className="button button--outline"
              >
                Add image
              </button>
            </div>
            {form.images.map((image, index) => (
              <div key={`image-${index}`} className="image-item">
                <input
                  type="url"
                  value={image}
                  onChange={(event) => updateImage(index, event.target.value)}
                  className="form__input"
                  placeholder="https://..."
                  required={index === 0}
                />
                {form.images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="button button--outline"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="button button--primary"
          >
            {isSaving ? "Saving..." : isEditing ? "Update product" : "Add product"}
          </button>
        </form>

        <div className="list">
          <h2>Current products</h2>
          {isLoading ? (
            <div className="loading">Loading products...</div>
          ) : (
            products.map((product) => {
              const coverImage = normalizeImageUrl(product.images?.[0] || "");
              return (
              <div key={product.id} className="list-item">
                <img src={coverImage} alt={product.name} />
                <div className="list-item__meta">
                  <p style={{ fontWeight: 600 }}>{product.name}</p>
                  <p className="helper">Offer {product.offerPrice}</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(product)}
                    className="button button--outline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id)}
                    className="button button--outline button--danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default Admin;
