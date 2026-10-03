import Fastify from "fastify";
import cors from "@fastify/cors";
import { registerErrorHandler } from "./errors.js";
import { registerRoutes } from "./routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || origin === "http://localhost:5173" || origin === "https://dailycheck-salsa.vercel.app" || /^https:\/\/dailycheck-.*\.vercel\.app$/.test(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  });
  registerErrorHandler(app);
  await registerRoutes(app);
  return app;
}
