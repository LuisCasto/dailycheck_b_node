import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SECRET_KEY: z.string().min(1),
  ALGORITHM: z.string().default("HS256"),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(10080),
  PORT: z.coerce.number().int().positive().default(8000),
  HOST: z.string().default("0.0.0.0"),
});

export const config = configSchema.parse(process.env);
