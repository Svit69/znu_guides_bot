import { config } from './config.js';
import { BotApp } from './bot/BotApp.js';

/**
 * Bootstraps the bot application.
 */
const app = new BotApp({ config });

app.start().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exitCode = 1;
});
