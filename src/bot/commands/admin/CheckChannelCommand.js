import { AdminCommand } from '../AdminCommand.js';

/**
 * Проверяет подписку указанных пользователей на канал.
 */
export class CheckChannelCommand extends AdminCommand {
  /**
   * @param {Object} params Параметры конструктора.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Сервис администрирования.
   * @param {import('../../services/SubscriptionService.js').SubscriptionService} params.subscriptionService Сервис проверки подписки.
   * @param {import('../../services/UserService.js').UserService} params.userService Сервис пользователей.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Логгер.
   */
  constructor({ adminService, subscriptionService, userService, logger }) {
    super('check_channel', { adminService, logger });
    this.subscriptionService = subscriptionService;
    this.userService = userService;
    /**
     * @private
     * @type {string}
     */
    this.channelUsername = '@goalevaya';
    /**
     * @private
     * @type {string}
     */
    this.channelLink = 't.me/goalevaya';
  }

  /**
   * @override
   * @param {import('grammy').Bot} bot Экземпляр бота.
   */
  register(bot) {
    super.register(bot);

    bot.on('message:text', async (ctx, next) => {
      ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };

      const auditState = ctx.session.subscriptionAudit;
      if (!auditState || auditState.initiatorId !== ctx.from?.id) {
        await next();
        return;
      }

      ctx.session.subscriptionAudit = null;

      const usernames = this.extractUsernames(ctx.message.text ?? '');
      if (!usernames.length) {
        await ctx.reply(
          'Не удалось распознать ни одного никнейма. Пожалуйста, вызови /check_channel ещё раз и пришли список, где каждый ник начинается с символа @ и размещён на отдельной строке.'
        );
        return;
      }

      await ctx.reply('Проверяю подписку, это может занять несколько секунд…');

      const report = await this.buildReport(ctx, usernames);
      await ctx.reply(report, { disable_web_page_preview: true });
    });
  }

  /**
   * @override
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Контекст Grammy.
  */
  async execute(ctx) {
    const initiatorId = ctx.from?.id;
    if (!initiatorId) {
      await ctx.reply('Не удалось определить отправителя команды. Попробуй ещё раз позднее.');
      return;
    }

    ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };
    ctx.session.subscriptionAudit = {
      initiatorId,
      requestedAt: new Date().toISOString()
    };

    await ctx.reply(
      [
        'Пришли список никнеймов, каждый с новой строки. Пример:',
        '@nickname1',
        '@nickname2',
        '@nickname3',
        '',
        `После получения списка я проверю, подписан ли каждый из них на канал ${this.channelLink}.`
      ].join('\n')
    );
  }

  /**
   * Разбирает исходный текст и возвращает список никнеймов без символа @.
   * @param {string} text Текстовое сообщение.
   * @returns {string[]}
   */
  // eslint-disable-next-line class-methods-use-this
  extractUsernames(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith('@') ? line.slice(1) : line))
      .map((line) => line.replace(/^https?:\/\/t\.me\//i, ''))
      .filter((line) => /^[a-zA-Z0-9_]{5,32}$/.test(line));
  }

  /**
   * Формирует отчёт по результатам проверки.
   * @param {import('grammy').Context} ctx Контекст Grammy.
   * @param {string[]} usernames Список никнеймов без символа @.
   * @returns {Promise<string>}
   */
  async buildReport(ctx, usernames) {
    const users = await this.userService.listUsers();
    const lookup = new Map(
      users
        .filter((user) => typeof user.username === 'string' && user.username)
        .map((user) => [user.username.toLowerCase(), user])
    );

    const rows = [];

    for (const username of usernames) {
      const stored = lookup.get(username.toLowerCase());

      if (!stored) {
        rows.push(`@${username} — пользователь не найден среди зарегистрированных в боте.`);
        continue;
      }

      try {
        const subscribed = await this.checkMembership(ctx, stored.id);
        rows.push(
          subscribed
            ? `@${username} — подписан ✅`
            : `@${username} — не подписан ❌`
        );
      } catch (error) {
        this.logger?.error?.(`Не удалось проверить подписку пользователя ${stored.id} (@${username}).`, error);
        const message = error && typeof error.message === 'string' ? error.message : 'см. логи';
        rows.push(`@${username} — ошибка проверки: ${message}`);
      }
    }

    return rows.length
      ? [`Результаты проверки подписки на канал ${this.channelLink}:`, ...rows].join('\n')
      : 'Не удалось собрать результаты проверки.';
  }

  /**
   * Выполняет запрос к Telegram API и определяет, является ли пользователь подписчиком.
   * @param {import('grammy').Context} ctx Контекст Grammy.
   * @param {number} userId Идентификатор пользователя.
   * @returns {Promise<boolean>}
   */
  async checkMembership(ctx, userId) {
    try {
      const member = await ctx.api.getChatMember(this.channelUsername, userId);
      if (this.subscriptionService?.isActiveMember) {
        return this.subscriptionService.isActiveMember(member);
      }

      return this.isActiveMember(member);
    } catch (error) {
      const missing =
        (typeof this.subscriptionService?.isUserMissingError === 'function' &&
          this.subscriptionService.isUserMissingError(error)) ||
        this.isUserMissingError(error);

      if (missing) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Проверяет, является ли объект участником канала (резервная логика).
   * @param {object} [member] Информация о пользователе в чате.
   * @returns {boolean}
   */
  // eslint-disable-next-line class-methods-use-this
  isActiveMember(member) {
    if (!member || typeof member !== 'object') {
      return false;
    }

    const { status } = member;

    if (status === 'restricted') {
      return 'is_member' in member ? Boolean(member.is_member) : false;
    }

    return status === 'creator' || status === 'administrator' || status === 'member';
  }

  /**
   * Определяет, указывает ли ошибка Telegram API на отсутствие пользователя в канале.
   * @param {unknown} error Ошибка API.
  * @returns {boolean}
   */
  // eslint-disable-next-line class-methods-use-this
  isUserMissingError(error) {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const description =
      typeof error.description === 'string'
        ? error.description
        : typeof error.message === 'string'
        ? error.message
        : '';

    if (!description) {
      return false;
    }

    const normalized = description.toLowerCase();
    return normalized.includes('user not found') || normalized.includes('user_not_participant');
  }
}
