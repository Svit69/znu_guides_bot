/**
 * Manages administrator-related operations.
 */
export class AdminService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {number[]} params.adminIds List of administrator Telegram user identifiers.
   * @param {{ adminOnly: string }} params.messages Shared user-facing messages.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger implementation.
   */
  constructor({ adminIds, messages, logger }) {
    /**
     * @private
     * @type {number[]}
     */
    this.adminIds = adminIds;

    /**
     * @private
     * @type {{ adminOnly: string }}
     */
    this.messages = messages;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;
  }

  /**
   * Checks whether provided user identifier belongs to an admin.
   * @param {number | undefined} userId Telegram user identifier.
   * @returns {boolean}
   */
  isAdmin(userId) {
    if (!userId) {
      return false;
    }

    return this.adminIds.includes(userId);
  }

  /**
   * Sends notification to all administrators.
   * @param {import('grammy').Bot} bot Bot instance used to deliver notifications.
   * @param {string} message Text message to send.
   * @param {{ excludeUserIds?: number[] }} [options] Additional options.
   * @returns {Promise<void>}
   */
  async notifyAdmins(bot, message, options = {}) {
    const { excludeUserIds = [] } = options;
    const targets = this.adminIds.filter((id) => !excludeUserIds.includes(id));

    await Promise.all(
      targets.map(async (adminId) => {
        try {
          await bot.api.sendMessage(adminId, message, { parse_mode: 'HTML' });
        } catch (error) {
          this.logger?.error(`Failed to send admin notification to user ${adminId}.`, error);
        }
      })
    );
  }

  /**
   * Replies with restriction notice if user is not admin.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<boolean>} Returns true when user is admin.
   */
  async ensureAdmin(ctx) {
    const userId = ctx.from?.id;

    if (!this.isAdmin(userId)) {
      await ctx.reply(this.messages.adminOnly);
      return false;
    }

    return true;
  }
}
