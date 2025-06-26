import express from "express";
import bodyParser from "body-parser";
import serverless from 'serverless-http';
import sql from "../config/db.js";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();
const SECRET_KEY = "rahasia_login";

app.set('view engine', 'ejs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

(async () => {
  try {
    await sql`SELECT NOW()`;
    console.log('✅ Terhubung ke database');
  } catch (err) {
    console.error('❌ Gagal konek:', err.message);
  }
})();

// Middleware verifikasi JWT
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/");

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) return res.redirect("/");
    req.user = decoded;
    next();
  });
}

// Routes

app.get("/", (req, res) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (!err) return res.redirect("/home");
    });
  }
  res.render("index");
});

app.get("/home", authenticateJWT, async (req, res) => {
  const result = await sql`SELECT * FROM users JOIN post ON username_id = users.id`;
  res.render("home", { data: result });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await sql`SELECT * FROM users WHERE username = ${username}`;
    const result = user[0];
    if (password === result.password) {
      const token = jwt.sign({ id: result.id }, SECRET_KEY, { expiresIn: "1h" });
      res.cookie("token", token, { httpOnly: true });
      return res.redirect("/home");
    }
  } catch (error) {
    console.error(error);
  }

  res.redirect("/");
});

app.post("/posting", authenticateJWT, async (req, res) => {
  const postingContent = req.body["post"];
  await sql`INSERT INTO post (username_id, content) VALUES (${req.user.id}, ${postingContent})`;
  res.redirect("/home");
});

app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

export default serverless(app);
