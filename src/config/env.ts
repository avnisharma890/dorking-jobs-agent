import dotenv from "dotenv";

dotenv.config();

const requiredEnv = ["NODE_ENV", "PORT", "DATABASE_URL"] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV as string,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL as string,
  serpApiKey: process.env.SERPAPI_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY!,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
};