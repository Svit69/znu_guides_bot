import { config as loadEnv } from 'dotenv';

loadEnv();

/**
 * Application-level configuration loaded from environment variables.
 * @typedef {Object} AppConfig
 * @property {string} botToken Telegram bot token.
 * @property {Object} polling Telegram polling configuration.
 * @property {string[]} polling.allowedUpdates Allowed update types for long polling.
 */

/**
 * @type {AppConfig}
 */
export const config = {
  botToken: process.env.BOT_TOKEN ?? '',
  polling: {
    allowedUpdates: []
  }
};

if (!config.botToken) {
  throw new Error('Environment variable BOT_TOKEN is required.');
}
