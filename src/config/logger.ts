import pino from "pino";
import { env } from "./env.js";

const level =
  process.env.LOG_LEVEL ||
  (env.nodeEnv === "production" ? "info" : "debug");

const transport =
  env.nodeEnv === "production"
    ? undefined
    : pino.transport({
        targets: [
          {
            target: "pino-pretty",
            level,
            options: { colorize: true },
          },
          {
            target: "pino/file",
            level: "debug",
            options: { destination: "./logs/app.log" },
          },
        ],
      });

export const logger = pino({ level }, transport);