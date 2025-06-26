import express from "express";
import serverless from "serverless-http";

const app = express();
app.set("views", path.join(__dirname, "views")); // TANPA ../
app.use(express.static(path.join(__dirname, "public")));


app.get("/", (req, res) => {
  res.send("✅ Hello from Express on Vercel!");
});

export const handler = serverless(app);
