import { CommandHandler } from '../core/CommandHandler.js';

/**
 * Keeps command handlers organized and ensures single responsibility of registration.
 */
export class CommandRegistry {
  /**
   * @param {import('grammy').Bot} bot Target bot instance.
   */
  constructor(bot) {
    /**
     * @private
     * @type {import('grammy').Bot}
     */
    this.bot = bot;

    /**
     * @private
     * @type {CommandHandler<import('grammy').Context>[]}
     */
    this.handlers = [];
  }

  /**
   * Adds handler to registry and registers with bot.
   * @param {CommandHandler<import('grammy').Context>} handler Command handler instance.
   */
  register(handler) {
    handler.register(this.bot);
    this.handlers.push(handler);
  }
}
