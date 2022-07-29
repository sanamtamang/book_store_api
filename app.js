const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "*",
  })
);
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(flash());

app.get("/book/list", async (req, res) => {
  const results = await pool.query("select * from book");
  const books = results.rows.map((book, i) => {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      imageUrl: book.imageurl,
      description: {
        publish_date: book.publish_date,
        price: book.price - (book.price * 10) / 100,
        discount: (book.price * 10) / 100,
      },
    };
  });
  res.json(books);
});

app.get("/book/:id", async (req, res) => {
  const id = req.params.id;
  const results = await pool.query(`SELECT * FROM book where id=${id}`);
  res.json(results.rows[0]);
});

app.get("/users/login", (req, res) => {
  res.send("login");
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  let errors = [];
  if (!name || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password should be at least 6 characters" });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords  do not match" });
  }

  if (errors.length < 6) {
    res.render("register", { errors });
  } else {
    let hashedPassword = await bcrypt.hash(password, 10);
    pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          throw err;
        } else {
          pool.query(
            `INSERT INTO users (name ,email,password) VALUES ($1,$2,$3) RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              req.flash("success_msg", "you are now registered . please login");
              res.redirect("/users/login");
              res.json(results.rows);
            }
          );
        }

        if (results.rows.length > 0) {
          errors.push({ message: "Email already registered" });
          res.render("register", { errors });
        }
      }
    );
  }
});

app.listen(process.env.PORT, () => {
  console.log("server is locahhost:", process.env.PORT);
});
