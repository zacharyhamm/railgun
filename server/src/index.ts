import path from "node:path";
import express from "express";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "../../client/dist")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
