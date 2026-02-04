import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 5000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "noft-admin";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";
const GITHUB_IMAGES_PATH =
  process.env.GITHUB_IMAGES_PATH || "frontend/public/uploads";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, "products.json");

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const getGithubConfig = () => {
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return null;
  }

  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
    basePath: GITHUB_IMAGES_PATH,
  };
};

const parseImageDataUrl = (dataUrl) => {
  if (!dataUrl) {
    throw new Error("Missing image data.");
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL.");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.split("/")[1]?.toLowerCase() || "png";

  return { base64, extension, mimeType };
};

const sanitizeFilename = (filename) =>
  filename
    ?.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^[-_]+/, "")
    .replace(/[-_]+$/, "");

const buildImagePath = (basePath, filename, extension) => {
  const safeName = sanitizeFilename(filename) || `image-${Date.now()}`;
  const hasExtension = safeName.includes(".");
  const finalName = hasExtension ? safeName : `${safeName}.${extension}`;
  const trimmedBase = basePath.replace(/\/+$/, "");

  return `${trimmedBase}/${Date.now()}-${finalName}`;
};

const buildRawUrl = ({ owner, repo, branch }, filePath) => {
  const encodedPath = filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodedPath}`;
};

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

app.post("/uploads/github", requireAdmin, async (req, res) => {
  try {
    const config = getGithubConfig();
    if (!config) {
      return res
        .status(500)
        .json({ message: "GitHub storage is not configured." });
    }

    const { dataUrl, filename } = req.body;
    const { base64, extension } = parseImageDataUrl(dataUrl);
    const filePath = buildImagePath(config.basePath, filename, extension);

    const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${filePath}?branch=${config.branch}`;
    const response = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "noft-backend",
      },
      body: JSON.stringify({
        message: `Upload ${filePath}`,
        content: base64,
        branch: config.branch,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        message: "Failed to upload image to GitHub.",
        details: errorBody,
      });
    }

    const payload = await response.json();
    const url =
      payload?.content?.download_url ||
      buildRawUrl(config, payload?.content?.path || filePath);

    res.status(201).json({ url, path: payload?.content?.path || filePath });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload image." });
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
