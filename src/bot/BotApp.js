import { Bot } from 'grammy';
import { Application } from '../core/Application.js';
import { ConsoleLogger } from '../core/Logger.js';
import { CommandRegistry } from './CommandRegistry.js';
import { StartCommand } from './commands/StartCommand.js';

/**
 * Orchestrates bot initialization and lifecycle.
 */
export class BotApp extends Application {
  /**
   * @param {Object} params Constructor parameters.
   * @param {typeof import('../config.js').config} params.config Application configuration.
   * @param {import('grammy').Bot} [params.bot] Preconfigured bot instance (useful for testing).
   * @param {CommandRegistry} [params.commandRegistry] Optional registry instance.
   * @param {import('../core/Logger.js').Logger} [params.logger] Custom logger implementation.
   */
  constructor({ config, bot, commandRegistry, logger }) {
    super({ logger: logger ?? new ConsoleLogger() });

    /**
     * @private
     * @type {import('../config.js').config}
     */
    this.config = config;

    /**
     * @private
     * @type {import('grammy').Bot}
     */
    this.bot = bot ?? new Bot(config.botToken);

    /**
     * @private
     * @type {CommandRegistry}
     */
    this.commandRegistry = commandRegistry ?? new CommandRegistry(this.bot);

    /**
     * @private
     * @type {boolean}
     */
    this.running = false;
  }

  /**
   * Registers all command handlers with the bot instance.
   */
  registerCommands() {
    this.commandRegistry.register(new StartCommand());
  }

  /**
   * Starts the bot using long polling.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.running) {
      this.logger?.info('Bot is already running.');
      return;
    }

    this.registerCommands();

    await this.bot.start({
      allowed_updates: this.config.polling.allowedUpdates,
      onStart: (info) => {
        this.logger?.info(`Bot started as @${info.username}.`);
      }
    });

    this.running = true;
  }

  /**
   * Stops the bot if it is running.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.running) {
      return;
    }

    this.bot.stop();
    this.running = false;
    this.logger?.info('Bot stopped.');
  }
}
