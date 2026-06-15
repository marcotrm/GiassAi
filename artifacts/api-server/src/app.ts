import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// In production, serve the frontend SPA static files
const frontendPath = path.resolve(__dirname, "../../aiagency-os/dist/public");
if (existsSync(frontendPath)) {
  logger.info({ path: frontendPath }, "Serving frontend static files");
  app.use(express.static(frontendPath));
  // SPA fallback: any non-API route serves index.html
  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

export default app;
