import express from "express";
import serverless from "serverless-http";
import path from "path"; // ✅ penting
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// setup EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));



app.get("/", (req, res) => {
  res.send("✅ Hello from Express on Vercel!");
});

export default app;