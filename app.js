require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth");
const pagesRoutes = require("./routes/pages");
const uploadRoutes = require("./routes/upload");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static frontend (dashboard) — served from /public
app.use(express.static(path.join(__dirname, "public")));

app.use("/auth", authRoutes);
app.use("/pages", pagesRoutes);
app.use("/upload", uploadRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

module.exports = app;
