import pino from "pino";
import fs from "fs";
import { env } from "./env.js";

const level =
  process.env.LOG_LEVEL ||
  (env.nodeEnv === "production" ? "info" : "debug");

// ensure logs dir exists
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

const streams = [];

// pretty console in dev
if (env.nodeEnv !== "production") {
  streams.push({
    level,
    stream: pino.transport({
      target: "pino-pretty",
      options: { colorize: true },
    }),
  });
}

// RELIABLE FILE LOGGING
streams.push({
  level: "debug",
  stream: pino.destination("logs/app.log"),
});

export const logger = pino(
  { level },
  pino.multistream(streams)
);