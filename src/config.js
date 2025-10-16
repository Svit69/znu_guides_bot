import { config as loadEnv } from 'dotenv';

loadEnv();

/**
 * Application-level configuration loaded from environment variables.
 * @typedef {Object} AppConfig
 * @property {string} botToken Telegram bot token.
 * @property {Object} polling Telegram polling configuration.
 * @property {string[]} polling.allowedUpdates Allowed update types for long polling.
 * @property {Array<{id: string, title: string, fileId: string}>} guides Available guide descriptors.
 * @property {{ noGuides: string }} messages Text resources used across the bot.
 */

/**
 * @type {AppConfig}
 */
export const config = {
  botToken: process.env.BOT_TOKEN ?? '',
  polling: {
    allowedUpdates: []
  },
  guides: [
    {
      id: 'choose-developer',
      title: 'Как выбрать застройщика?',
      fileId: process.env.GUIDE_DEVELOPER_FILE_ID ?? ''
    },
    {
      id: 'choose-land-plot',
      title: 'Как выбрать земельный участок?',
      fileId: process.env.GUIDE_LAND_PLOT_FILE_ID ?? ''
    }
  ],
  messages: {
    noGuides:
      'Пока гайдов нет, но дух стройки жив! Уже завозим контент, ставим леса и натягиваем сетку полезных советов'
  }
};

if (!config.botToken) {
  throw new Error('Environment variable BOT_TOKEN is required.');
}
