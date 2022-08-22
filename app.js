const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const session = require("express-session");
const flash = require("express-flash");
const cors = require("cors");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

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
      success: true,
      message: "",
      data: {
        id: results.rows[0].id,
        name: results.rows[0].name,
        email: results.rows[0].email,
      },
    });
  } catch (err) {
    if (err.code === "23505") {
      res.status(200).json({
        message: "Email already exists",
        success: false,
        data: null,
      });
    } else {
      res.status(500).json({
        message: "Internal server error",
      });
    }
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
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.TOKEN_KEY,
        {
          expiresIn: "5m",
        }
      );

      res.json({
        token: token,
        name: user.name,
        email: user.email,
        success: true,
      });
    } else {
      res.send("this is not allowed");
    }
  } catch (err) {
    res.status(500).json({});
  }
});

app.get("/user/logout", async (req, res) => {
  const id = req.params.id;
  console.log("id", id);
  if (id) {
    delete id;
    res.json({ result: "SUCCESS" });
  } else {
    res.json({ result: "ERROR", message: "User is not logged in." });
  }
});
app.get("/current-user", (req, res) => {
  const token = req.headers["authorization"];
  const decodedUser = jwt.verify(token, process.env.TOKEN_KEY);
  res.json(decodedUser);
});

app.post("/user/password/forgot", async (req, res) => {
  const email = req.body.email;
  const result = await pool.query(`SELECT * FROM users where email='${email}'`);
  const userExists = result.rows.length > 0;
  if (!userExists) {
    res.status(400).json({
      success: false,
      message: "User doesn't exist!",
    });
  }
  const user = result.rows[0];
  const randomCode = Math.floor(Math.random() * 1000000);
  console.log("email code", randomCode);
  const results = await pool.query(
    "INSERT INTO email_code(code,email) values($1,$2) returning *",
    [randomCode, user.email]
  );
  res.json({
    success: true,
    message: "Please check your email to get the code",
    data: {
      email: results.rows[0].email,
    },
  });
});
app.post("/user/code/verify", async (req, res) => {
  // code, email
  // timestamp
  // code last ko nikalne
  // user ko code sanga cmpare
  // milyo vane code verified
  // milne code incorrect
  // const email = req.body.email;
  const randomCode = req.body.code;
  // const email = req.body.email;

  // console.log(email);

  const results = await pool.query(
    `SELECT * FROM email_code where code=${randomCode}`
  );
  console.log(results);

  res.json({
    success: true,
    message: "Verified",
    data: {},
  });
});
app.listen(process.env.PORT, () => {
  console.log("server is locahhost:", process.env.PORT);
});
