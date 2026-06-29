import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

const port = Number(process.env["PORT"]) || 3000;
const host = "0.0.0.0";

app.listen(port, host, () => {
  logger.info({ port, host }, "Server listening");
});
