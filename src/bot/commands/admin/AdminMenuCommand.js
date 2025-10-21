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
        'Доступные админские команды:',
        '/admin — показать справку по админ-командам.',
        '/show_guides — перечень загруженных гайдов.',
        '/add — начать добавление нового гайда.',
        '/users — список зарегистрированных пользователей бота.',
        '/check_channel — проверить подписку пользователей на канал t.me/goalevaya.',
        '/image_menu — управление изображениями меню.',
        '/delete — удалить гайд.',
        '/confirm — подтвердить последнее действие.',
        '/cancel — отменить активный процесс.'
      ].join('\n')
    );
  }
}
