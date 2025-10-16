import { CommandHandler } from '../../core/CommandHandler.js';

/**
 * Handles the /start command.
 */
export class StartCommand extends CommandHandler {
  constructor() {
    super('start');
  }

  /**
   * Sends a greeting message to the user.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async execute(ctx) {
    await ctx.reply('Тест');
  }
}
