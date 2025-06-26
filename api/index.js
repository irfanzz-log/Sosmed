import express from "express";
import serverless from "serverless-http";

const app = express();

app.get("/", (req, res) => {
  res.send("✅ Express on Vercel works!");
});

export const handler = serverless(app);
