/**
 * Contract for command handlers to keep command logic encapsulated.
 * @template {import('grammy').Context} TContext
 */
export class CommandHandler {
  /**
   * @param {string} command Bot command without slash prefix.
   */
  constructor(command) {
    if (new.target === CommandHandler) {
      throw new TypeError('CommandHandler is abstract and cannot be instantiated directly.');
    }

    /**
     * @private
     * @type {string}
     */
    this._command = command;
  }

  /**
   * Command identifier defined for the handler.
   * @returns {string}
   */
  get command() {
    return this._command;
  }

  /**
   * Registers the handler logic on the provided bot instance.
   * @param {import('grammy').Bot<TContext>} bot Telegram bot instance.
   */
  register(bot) {
    bot.command(this.command, (ctx) => this.execute(ctx));
  }

  /**
   * Executes the handler logic.
   * @abstract
   * @param {TContext} ctx Grammy context.
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this
  async execute(ctx) {
    throw new TypeError('CommandHandler subclasses must implement execute().');
  }
}
