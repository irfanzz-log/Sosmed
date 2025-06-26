import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import session from "express-session";
import sql from "../config/db.js"; // sesuaikan path jika config terpisah

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'rahasia_login',
  resave: false,
  saveUninitialized: true
}));

app.get("/", (req, res) => {
  req.session.loggedIn ? res.redirect("/home") : res.render("index");
});

app.get("/home", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  const result = await sql`SELECT * FROM users JOIN post ON username_id = users.id`;
  res.render("home", { data: result });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
    if (user && password === user.password) {
      req.session.loggedIn = true;
      req.session.userId = user.id;
      return res.redirect("/home");
    }
  } catch (e) {}
  res.redirect("/");
});

app.post("/posting", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  await sql`INSERT INTO post (username_id, content) VALUES (${req.session.userId}, ${req.body.post})`;
  res.redirect("/home");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

export default app;
