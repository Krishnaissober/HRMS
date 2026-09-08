import pino from "pino";
import { env } from "@/lib/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    "req.headers.authorization",
    "password",
    "token",
    "secret",
    "accessToken",
    "refreshToken",
  ],
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
