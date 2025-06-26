import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import session from "express-session";
import sql from "../config/db.js"; // sesuaikan path jika config terpisah
import Pusher from "pusher";

const pusher = new Pusher({
  appId:process.env.PUSHER_APP_ID,
  key:process.env.PUSHER_KEY,
  secret:process.env.PUSHER_SECRET,
  cluster:process.env.PUSHER_CLUSTER,
  useTLS:true
});


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

let alert;

app.get("/", (req, res) => {
  req.session.loggedIn ? res.redirect("/home") : res.render("index");
});

app.get("/home", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  const result = await sql`SELECT * FROM users JOIN post ON username_id = users.id`;
  res.render("home", { data: result });
});

app.get("/login", (req,res) => {
  if (req.session.loggedIn) return res.redirect("/home");
  res.render("index", alert);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [user] = await sql`SELECT * FROM users WHERE username = ${username}`;
    if (password === user.password) {
      req.session.loggedIn = true;
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.save(err => {
        if (err) {
          return res.status(500).send("Session save error");
        }
        res.redirect("/home");
      });
    }

  } catch (err) {
    res.send(err);
  }
});

app.get("/register", (req,res) => {
  if (req.session.loggedIn) return res.redirect("/home");
  res.render("regist");
})

app.post("/registered", async (req,res) => {
  const { name,username, password } = req.body;
  try {
    if (username && password === "") {
      alert = "Form tidak boleh kosong!";
      return res.redirect("/register");
    }

    await sql`INSERT INTO users (name_user,username,password) VALUES (${name},${username},${password})`;
    alert = "Pendaftaran Berhasil!";
    return res.redirect("/");
  } catch (err) {
    res.send(err);
  }

})

app.post("/posting", async (req, res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  
  const content = req.body.post;
  const userId = req.session.userId;
  
  const [inserted] = await sql`
    INSERT INTO post (username_id, content)
    VALUES (${userId}, ${content})
    RETURNING *;
  `;

  console.log("Posting hit, body:", req.body);

  const post = {
    id: inserted.id,
    content: inserted.content,
    post_created_at: inserted.post_created_at,
    name_user: req.session.username // atau ambil nama dari DB jika perlu
  };

  // Kirim ke Pusher
  pusher.trigger("posts", "new-post", post);
  
  res.redirect("/home");
});


app.post("/home/dev",(req,res) => {
  if (!req.session.loggedIn) return res.redirect("/");
  res.render("dev");
})

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});
export default app;
