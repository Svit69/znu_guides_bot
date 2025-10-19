import { AdminCommand } from '../AdminCommand.js';

/**
 * Displays available admin commands.
 */
export class AdminMenuCommand extends AdminCommand {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Admin service.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ adminService, logger }) {
    super('admin', { adminService, logger });
  }

  /**
   * @override
   * @param {import('grammy').Context} ctx Grammy context.
   */
  async execute(ctx) {
    await ctx.reply(
      [
        'Админские команды:',
        '/admin — список админских команд.',
        '/show_guides — показать список всех гайдов.',
        '/add — добавить новый гайд.',
        '/image_menu — загрузить медиа перед меню с гайдами.',
        '/delete — удалить гайд.',
        '/confirm — подтвердить текущее действие.',
        '/cancel — отменить текущее действие.'
      ].join('\n')
    );
  }
}
