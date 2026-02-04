import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuthToken, getAuthHeader } from "../utils/auth.js";

const API_URL = import.meta.env.VITE_API_URL;
const emptyForm = {
  id: null,
  name: "",
  description: "",
  price: "",
  offerPrice: "",
  images: [],
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

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const MAX_IMAGES = 2;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

const Admin = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const remaining = MAX_IMAGES - form.images.length;
    if (remaining <= 0) {
      event.target.value = "";
      return;
    }

    const validFiles = files.filter((file) => file.size <= MAX_IMAGE_BYTES);
    if (validFiles.length < files.length) {
      window.alert("Each image must be 2MB or smaller.");
    }

    const uploadImageToGithub = async (file) => {
      const dataUrl = await fileToDataUrl(file);
      const safeName = form.name?.trim() ? form.name.trim() : "product";
      const filename = `${safeName}-${Date.now()}-${file.name}`;

      const response = await fetch(`${API_URL}/uploads/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ dataUrl, filename }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload image to GitHub.");
      }

      const payload = await response.json();
      if (!payload?.url) {
        throw new Error("Missing uploaded image URL.");
      }

      return payload.url;
    };

    try {
      setIsUploading(true);
      const uploads = [];
      for (const file of validFiles.slice(0, remaining)) {
        // Upload sequentially to keep ordering stable
        const url = await uploadImageToGithub(file);
        uploads.push(url);
      }
      setForm((prev) => ({
        ...prev,
        images: [...prev.images, ...uploads].slice(0, MAX_IMAGES),
      }));
    } catch (error) {
      console.error("Failed to upload image files", error);
      window.alert("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
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
      images: product.images?.length ? product.images : [],
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
              <p className="eyebrow">Images</p>
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageFiles}
              className="form__input"
              required={form.images.length === 0}
              disabled={form.images.length >= MAX_IMAGES || isUploading}
            />
            {form.images.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "12px",
                }}
              >
                {form.images.map((image, index) => (
                  <div
                    key={`image-${index}`}
                    className="image-item"
                    style={{
                      position: "relative",
                      width: "88px",
                      height: "88px",
                      borderRadius: "10px",
                      overflow: "hidden",
                      border: "1px solid #e5e7eb",
                      background: "#f8fafc",
                    }}
                  >
                    <img
                      src={image}
                      alt={`Upload ${index + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImageField(index)}
                      className="button button--outline"
                      aria-label="Remove image"
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        width: "22px",
                        height: "22px",
                        padding: 0,
                        borderRadius: "999px",
                        lineHeight: 1,
                      }}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving || isUploading || form.images.length === 0}
            className="button button--primary"
          >
            {isUploading
              ? "Uploading..."
              : isSaving
                ? "Saving..."
                : isEditing
                  ? "Update product"
                  : "Add product"}
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
