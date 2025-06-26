import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import serverless from 'serverless-http';
import sql from "../config/db.js";
import { fileURLToPath } from 'url';
import path from 'path';

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

(async () => {
  try {
    await sql`SELECT NOW()`;
    console.log('✅ Terhubung ke database');
  } catch (err) {
    console.error('❌ Gagal konek:', err.message);
  }
})();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: 'rahasia_login',
  resave: false,
  saveUninitialized: true
}));

app.get("/", async (req,res) => {
  if(req.session.loggedIn === true) {
    res.redirect("/home");
  } else {
    res.render("index");
  }
});

app.get("/home", async (req,res) => {
  const result = await sql`SELECT * FROM users JOIN post ON username_id = users.id `;
  console.log(result)
  if(req.session.loggedIn === true ) {
    res.render("home",{data:result});
  } else {
    res.redirect("/");
  }
});

app.post("/login", async (req,res) => {
const {username,password} = req.body;

try {
  const user = await sql`SELECT * FROM users WHERE username = ${username}`;
  const result = user[0];
  if(password === result.password ){
    req.session.loggedIn = true;
    req.session.userId = result.id;
    res.redirect("/home");
    
  }
} catch (error) {
  res.redirect("/");
}
});

app.post("/posting", async (req,res) => {
  if (!req.session.loggedIn) return res.redirect("/");

  const postingContent = req.body["post"];
  
  await sql`INSERT INTO post (username_id,content) VALUES (${req.session.userId},${postingContent})`

  res.redirect("/home");
})

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

export default serverless(app);
