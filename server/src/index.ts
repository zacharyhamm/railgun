import path from "node:path";
import express from "express";
import { authMiddleware, oauthRouter } from "./oauth";
import { projectsRouter } from "./projects";

const app = express();
app.set("trust proxy", true);
const port = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "../../client/dist")));

app.use("/oauth", oauthRouter);
app.use("/api", authMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/projects", projectsRouter);

app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(__dirname, "../../client/dist/index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
