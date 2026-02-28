import TelegramBot from "node-telegram-bot-api";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

let bot: TelegramBot | null = null;

// one-line: lazy singleton bot initializer
function getBot(): TelegramBot {
  if (!env.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  if (!bot) {
    bot = new TelegramBot(env.telegramBotToken, {
      polling: false,
    });
  }
  return bot;
}

// send formatted digest message
export async function sendTelegramDigest(message: string) {
  try {
    if (!env.telegramChatId) {
      logger.warn("⚠️ TELEGRAM_CHAT_ID missing");
      return;
    }

    const telegram = getBot();

    await telegram.sendMessage(env.telegramChatId, message, {
    //   parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

    logger.info({ chatId: env.telegramChatId }, "📨 Telegram digest sent");
  } catch (err) {
    logger.error({ err }, "❌ Telegram send failed");
  }
}
