import { CommandHandler } from '../../core/CommandHandler.js';

/**
 * Base command for administrator-only operations.
 */
export class AdminCommand extends CommandHandler {
  /**
   * @param {string} command Command name without the slash.
    * @param {Object} params Constructor parameters.
   * @param {import('../services/AdminService.js').AdminService} params.adminService Administrator service.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger instance.
   */
  constructor(command, { adminService, logger }) {
    super(command);

    /**
     * @protected
     * @type {import('../services/AdminService.js').AdminService}
     */
    this.adminService = adminService;

    /**
     * @protected
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;
  }

  /**
   * @override
   * @param {import('grammy').Bot} bot Telegram bot instance.
   */
  register(bot) {
    bot.command(this.command, async (ctx) => {
      const isAdmin = await this.adminService.ensureAdmin(ctx);
      if (!isAdmin) {
        return;
      }

      await this.execute(ctx);
    });
  }

  /**
   * @override
   * @param {import('grammy').Context} ctx Grammy context.
   */
  // eslint-disable-next-line class-methods-use-this
  async execute(ctx) {
    throw new TypeError('AdminCommand subclasses must implement execute().');
  }
}
