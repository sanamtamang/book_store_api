require("dotenv").config();

const express = require("express");
const { Client } = require("pg");

//Express App

const app = express();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect((err) => {
  if (err) {
    console.log("Database Connection Failed");
  } else {
    console.log("Database Connection Successfully");
  }
});
app.get("/book/list", async (req, res) => {
  const results = await client.query("select * from book");
  const books = results.rows.map((book, i) => {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      description: {
        publish_date: book.publish_date,
        price: book.price,
      },
    };
  });
  res.json(books);
});

app.listen(process.env.PORT, () => {
  console.log("server is locahhost:", process.env.PORT);
});
