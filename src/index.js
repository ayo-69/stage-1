const express = require("express");
const app = express();

// Load dotenv variables
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(express.urlencoded());

// Register routes
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
})
