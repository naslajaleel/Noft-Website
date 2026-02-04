import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "noft-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "products.json");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  next();
};

const readProducts = async () => {
  const raw = await fs.readFile(dataPath, "utf-8");
  return JSON.parse(raw);
};

const writeProducts = async (products) => {
  await fs.writeFile(dataPath, JSON.stringify(products, null, 2));
};

app.get("/products", async (_req, res) => {
  try {
    const products = await readProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Failed to read products." });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const products = await readProducts();
    const product = products.find((item) => item.id === req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Failed to read product." });
  }
});

app.post("/products", requireAdmin, async (req, res) => {
  try {
    const { name, description, price, offerPrice, images } = req.body;

    if (!name || !offerPrice || !Array.isArray(images)) {
      return res
        .status(400)
        .json({ message: "Name, offerPrice, and images are required." });
    }

    const products = await readProducts();
    const newProduct = {
      id: Date.now().toString(),
      name,
      description: description || "",
      price: Number(price) || Number(offerPrice),
      offerPrice: Number(offerPrice),
      images,
    };

    products.push(newProduct);
    await writeProducts(products);

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: "Failed to create product." });
  }
});

app.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const products = await readProducts();
    const index = products.findIndex((item) => item.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Product not found." });
    }

    const current = products[index];
    const updated = {
      ...current,
      ...req.body,
      price: Number(req.body.price ?? current.price),
      offerPrice: Number(req.body.offerPrice ?? current.offerPrice),
      images: Array.isArray(req.body.images)
        ? req.body.images
        : current.images,
    };

    products[index] = updated;
    await writeProducts(products);

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Failed to update product." });
  }
});

app.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const products = await readProducts();
    const filtered = products.filter((item) => item.id !== req.params.id);

    if (filtered.length === products.length) {
      return res.status(404).json({ message: "Product not found." });
    }

    await writeProducts(filtered);
    res.json({ message: "Product deleted." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete product." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
