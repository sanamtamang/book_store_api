const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const cors = require("cors");
const bodyParser = require("body-parser");
const { query } = require("express");

const app = express();

app.use(bodyParser.json());

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

app.post("/users/register", async (req, res) => {
  const usersList = req.body;

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(usersList.password, salt);

    const results = await pool.query(
      "INSERT INTO users(name, email, password) values($1, $2, $3) returning *",
      [usersList.name, usersList.email, hashedPassword]
    );

    res.status(201).json({
      id: results.rows[0].id,
      name: results.rows[0].name,
      email: results.rows[0].email,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});
app.post("/users/login", async (req, res) => {
  const results = await pool.query(
    `SELECT * FROM users where email='${req.body.email}'`
  );
  const user = results.rows[0];

  if (user === null || user === undefined) {
    return res.status(400).send("can not find user");
  }
  try {
    if (bcrypt.compareSync(req.body.password, user.password)) {
      res.send("success");
    } else {
      res.send("this is not allowed");
    }
  } catch (err) {
    console.log(err);
    res.status(500).send();
  }
});

app.listen(process.env.PORT, () => {
  console.log("server is locahhost:", process.env.PORT);
});
