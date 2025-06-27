import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import sql from "../config/db.js"; // sesuaikan path jika config terpisah


const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // sesuaikan
  ssl: { rejectUnauthorized: false }
});
const PgSession = connectPgSimple(session);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json()); // sebelum route
app.use(bodyParser.urlencoded({ extended: true }));


app.use(session({
  store: new PgSession({ pool: pgPool }),
  secret: 'rahasia_login',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 hari
}));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

let alert = "";

app.get("/", (req, res) => {
  req.session.loggedIn ? res.redirect("/home") : res.render("index");
});

app.get("/home", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/");

  const result = await sql`
    SELECT post.content, post.post_created_at, users.username, users.name_user
    FROM post
    JOIN users ON post.username_id = users.id
    ORDER BY post.post_created_at DESC
  `;

  res.render("home", { data: result });
});

app.get("/login", (req,res) => {
  try {
    if (req.session.loggedIn) {res.redirect("/home")};
    res.render("index", alert);
  } catch (err) {
    res.send(err);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [user] = await sql`SELECT * FROM users WHERE username ${username}`;
    const userData = user[0];

    if (!userData) return res.send("User tidak ditemukan");
    if (password !== userData.password) return res.send("Password salah");

    req.session.loggedIn = true;
    req.session.userId = userData.id;
    req.session.username = userData.username;

    req.session.save(err => {
      if (err) return res.status(500).send("Gagal menyimpan session");
      res.redirect("/home");
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi kesalahan saat login");
  }
});

app.get("/register", (req,res) => {
  if (req.session.loggedIn) return res.redirect("/home");
  res.render("regist",{alert:alert});
})

app.post("/registered", async (req, res) => {
  const { name, username, password } = req.body;

  try {
    // Cek apakah ada yang kosong
    if (!name?.trim() || !username?.trim() || !password?.trim()) {
      alert = "Form tidak boleh kosong!";
      return res.redirect("/register");
    }

    // Cek apakah username sudah ada
    const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
    const userData = user[0];
    if (userData) {
      alert = "Username sudah didaftarkan!";
      return res.redirect("/register");
    }

    // Insert user baru
    await sql`
      INSERT INTO users (name_user, username, password)
      VALUES (${name}, ${username}, ${password})
    `;

    alert = "Pendaftaran Berhasil!";
    return res.redirect("/");
    
  } catch (err) {
    console.error("Register error:", err);
    alert = "Terjadi kesalahan saat daftar.";
    return res.redirect("/register");
  }
});


app.post("/posting", async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Unauthorized' });
  const content = req.body.post;
  const userId = req.session.userId;
  
    await sql`
    INSERT INTO post (username_id, content)
    VALUES (${userId}, ${content})
    RETURNING *;
  `;
  res.redirect("/home");
});

app.post("/home/dev",(req,res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  res.render("dev");
})

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.use((req, res, next) => {
  res.status(404).render("404"); // file 404.ejs
});

export default app;
