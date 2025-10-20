import { AdminCommand } from '../AdminCommand.js';

/**
 * Handles /users command to display registered bot users.
 */
export class ListUsersCommand extends AdminCommand {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Admin service.
   * @param {import('../../services/UserService.js').UserService} params.userService User service.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ adminService, userService, logger }) {
    super('users', { adminService, logger });
    this.userService = userService;
  }

  /**
   * @override
   * @param {import('grammy').Context} ctx Grammy context.
   */
  async execute(ctx) {
    try {
      const users = await this.userService.listUsers();

      if (!users.length) {
        await ctx.reply('Пока ни один пользователь не зарегистрировался в боте.');
        return;
      }

      const lines = users.map((user, index) => this.formatUserLine(user, index));
      const response = ['Зарегистрированные пользователи:', ...lines].join('\n');

      await ctx.reply(response);
    } catch (error) {
      this.logger?.error('Failed to list registered users.', error);
      await ctx.reply('Не удалось получить список пользователей. Попробуйте позже.');
    }
  }

  /**
   * Formats single user row for output.
   * @param {Object} user User descriptor.
   * @param {number} index Position inside the list.
   * @returns {string}
   */
  formatUserLine(user, index) {
    const order = index + 1;
    const nameParts = [user.firstName, user.lastName].filter(Boolean);
    const displayName = nameParts.length ? nameParts.join(' ') : '—';
    const username = user.username ? `@${user.username}` : 'нет username';
    const phone = user.phoneNumber ? user.phoneNumber : 'телефон не указан';
    const registeredAt = user.registeredAt
      ? this.formatDate(user.registeredAt)
      : 'дата неизвестна';

    return `${order}. ID ${user.id} (${username}) — ${displayName}; ${phone}; зарегистрирован: ${registeredAt}`;
  }

  /**
   * Formats ISO date-safe string into human-readable short form.
   * @param {string} isoString ISO date string.
   * @returns {string}
   */
  // eslint-disable-next-line class-methods-use-this
  formatDate(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }
}
