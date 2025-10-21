/**
 * Coordinates multi-step admin flows such as adding or deleting guides.
 */
export class AdminFlowManager {
  /**
   * @param {Object} params Constructor parameters.
   * @param {GuideService} params.guideService Guide application service.
   * @param {AdminService} params.adminService Administrator service.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger.
   * @param {{ guideAdded: string, guideDeleted: string, nothingToConfirm: string, flowCancelled: string, noGuides: string }} params.messages Shared messages.
   */
  constructor({ guideService, adminService, logger, messages }) {
    /**
     * @private
     * @type {GuideService}
     */
    this.guideService = guideService;

    /**
     * @private
     * @type {AdminService}
     */
    this.adminService = adminService;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;

    /**
     * @private
     * @type {{ guideAdded: string, guideDeleted: string, nothingToConfirm: string, flowCancelled: string, noGuides: string }}
     */
    this.messages = messages;

    /**
     * @private
     * @type {import('grammy').Bot | null}
     */
    this.bot = null;
  }

  /**
   * Registers handlers on bot instance.
   * @param {import('grammy').Bot} bot Bot instance.
   */
  register(bot) {
    this.bot = bot;
    bot.on('message:text', async (ctx, next) => {
      const handled = await this.handleTextMessage(ctx);
      if (!handled) {
        await next();
      }
    });

    bot.on('message:document', async (ctx, next) => {
      const handled = await this.handleDocumentMessage(ctx);
      if (!handled) {
        await next();
      }
    });

    bot.command('confirm', async (ctx) => {
      const isAdmin = await this.adminService.ensureAdmin(ctx);
      if (!isAdmin) {
        return;
      }

      const flow = this.getFlow(ctx);

      if (!flow) {
        await ctx.reply(this.messages.nothingToConfirm);
        return;
      }

      if (flow.mode === 'add' && flow.step === 'awaiting_confirmation') {
        await this.confirmAdd(ctx, flow);
        return;
      }

      if (flow.mode === 'delete' && flow.step === 'awaiting_confirmation') {
        await this.confirmDelete(ctx, flow);
        return;
      }

      await ctx.reply(this.messages.nothingToConfirm);
    });

    bot.command('cancel', async (ctx) => {
      const isAdmin = await this.adminService.ensureAdmin(ctx);
      if (!isAdmin) {
        return;
      }

      ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };
      const hasMenuMediaFlow = Boolean(ctx.session.menuMediaFlow?.awaitingMedia);

      if (this.getFlow(ctx)) {
        await this.resetFlow(ctx);
        await ctx.reply(this.messages.flowCancelled);
        return;
      }

      if (hasMenuMediaFlow) {
        ctx.session.menuMediaFlow = null;
        await ctx.reply(this.messages.flowCancelled);
      } else {
        await ctx.reply(this.messages.nothingToConfirm);
      }
    });
  }

  /**
   * Starts add guide flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context with session.
   * @returns {Promise<void>}
   */
  async startAddFlow(ctx) {
    ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };

    ctx.session.adminFlow = {
      initiatorId: ctx.from?.id ?? 0,
      mode: 'add',
      step: 'awaiting_title',
      payload: {}
    };

    await ctx.reply(
      'Введите название гайда.\n\nОтправьте /cancel, если хотите прекратить добавление.',
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Starts delete guide flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context with session.
   * @returns {Promise<void>}
   */
  async startDeleteFlow(ctx) {
    const guides = await this.guideService.listAllGuides();

    if (!guides.length) {
      await ctx.reply(this.messages.noGuides);
      return;
    }

    const listing = guides.map((guide) => `${guide.id} | ${guide.title}`).join('\n');
    const safeListing = this.escapeHtml(listing);

    await ctx.reply(
      [
        'Текущий список гайдов:',
        `<pre>${safeListing}</pre>`,
        '',
        'Отправьте ID гайда, который требуется удалить, или /cancel.'
      ].join('\n'),
      { parse_mode: 'HTML' }
    );

    ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };
    ctx.session.adminFlow = {
      initiatorId: ctx.from?.id ?? 0,
      mode: 'delete',
      step: 'awaiting_id',
      payload: {}
    };
  }

  /**
   * Handles text messages emitted during admin flows.
   * @param {import('grammy').Context & { session?: import('../types.js').BotSession }} ctx Grammy context.
   * @returns {Promise<boolean>} True when message was consumed.
   */
  async handleTextMessage(ctx) {
    const flow = this.getFlow(ctx);

    if (!flow) {
      return false;
    }

    const isAdmin = await this.adminService.ensureAdmin(ctx);
    if (!isAdmin) {
      return true;
    }

    if (!ctx.message?.text || ctx.message.text.startsWith('/')) {
      return false;
    }

    if (!flow) {
      return false;
    }

    if (flow.mode === 'add' && flow.step === 'awaiting_title') {
      await this.processAddTitle(ctx, flow);
      return true;
    }

    if (flow.mode === 'delete' && flow.step === 'awaiting_id') {
      await this.processDeleteId(ctx, flow);
      return true;
    }

    return false;
  }

  /**
   * Handles document messages in admin flows.
   * @param {import('grammy').Context & { session?: import('../types.js').BotSession }} ctx Grammy context.
   * @returns {Promise<boolean>} True when message was consumed.
   */
  async handleDocumentMessage(ctx) {
    const flow = this.getFlow(ctx);

    if (!flow) {
      return false;
    }

    const isAdmin = await this.adminService.ensureAdmin(ctx);
    if (!isAdmin) {
      return true;
    }

    if (flow.mode === 'add' && flow.step === 'awaiting_document') {
      await this.processAddDocument(ctx, flow);
      return true;
    }

    return false;
  }

  /**
   * Processes title input during add flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @param {import('../types.js').AdminFlowState} flow Admin flow state.
   * @returns {Promise<void>}
   */
  async processAddTitle(ctx, flow) {
    const title = ctx.message?.text?.trim();

    if (!title) {
      await ctx.reply('Название не должно быть пустым. Попробуйте снова или используйте /cancel.');
      return;
    }

    flow.payload.title = title;
    flow.step = 'awaiting_document';

    await ctx.reply(
      'Отправьте PDF-файл гайда в качестве документа.\n\nКогда документ будет загружен, подтвердите действие командой /confirm или отмените через /cancel.'
    );
  }

  /**
   * Processes document upload during add flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @param {import('../types.js').AdminFlowState} flow Admin flow state.
   * @returns {Promise<void>}
   */
  async processAddDocument(ctx, flow) {
    const document = ctx.message?.document;

    if (!document) {
      await ctx.reply('Не удалось получить документ. Пожалуйста, попробуйте снова.');
      return;
    }

    const isPdf =
      document.mime_type === 'application/pdf' ||
      (document.file_name ? document.file_name.toLowerCase().endsWith('.pdf') : false);

    if (!isPdf) {
      await ctx.reply('Поддерживаются только PDF-файлы. Загрузите корректный документ или отмените /cancel.');
      return;
    }

    flow.payload.fileId = document.file_id;
    flow.step = 'awaiting_confirmation';

    const safeTitle = this.escapeHtml(flow.payload.title ?? '');
    const safeFileName = this.escapeHtml(document.file_name ?? 'PDF');

    await ctx.reply(
      [
        'Проверьте данные:',
        `Название: <b>${safeTitle}</b>`,
        `Файл: <code>${safeFileName}</code>`,
        '',
        'Подтвердить — /confirm',
        'Отменить — /cancel'
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Processes guide selection during delete flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @param {import('../types.js').AdminFlowState} flow Admin flow state.
   * @returns {Promise<void>}
   */
  async processDeleteId(ctx, flow) {
    const guideId = ctx.message?.text?.trim();

    if (!guideId) {
      await ctx.reply('Некорректный идентификатор. Попробуйте снова или используйте /cancel.');
      return;
    }

    const guide = await this.guideService.getGuideById(guideId);

    if (!guide) {
      await ctx.reply('Гайд не найден. Проверьте ID и попробуйте ещё раз или отмените /cancel.');
      return;
    }

    flow.payload.guideId = guide.id;
    flow.payload.guideTitle = guide.title;
    flow.step = 'awaiting_confirmation';

    const safeId = this.escapeHtml(guide.id);
    const safeTitle = this.escapeHtml(guide.title);

    await ctx.reply(
      [
        'Подтвердите удаление гайда:',
        `ID: <code>${safeId}</code>`,
        `Название: <b>${safeTitle}</b>`,
        '',
        'Подтвердить — /confirm',
        'Отменить — /cancel'
      ].join('\n'),
      { parse_mode: 'HTML' }
    );
  }

  /**
   * Confirms add guide flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @param {import('../types.js').AdminFlowState} flow Admin flow state.
   * @returns {Promise<void>}
   */
  async confirmAdd(ctx, flow) {
    if (!flow.payload.title || !flow.payload.fileId) {
      await ctx.reply('Не хватает данных для добавления гайда. Попробуйте снова.');
      return;
    }

    await this.guideService.createGuide({
      title: flow.payload.title,
      fileId: flow.payload.fileId
    });

    await this.resetFlow(ctx);
    await ctx.reply(this.messages.guideAdded);
  }

  /**
   * Confirms delete flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @param {import('../types.js').AdminFlowState} flow Admin flow state.
   * @returns {Promise<void>}
   */
  async confirmDelete(ctx, flow) {
    if (!flow.payload.guideId) {
      await ctx.reply('Не выбран гайд для удаления. Попробуйте снова.');
      return;
    }

    const removed = await this.guideService.deleteGuide(flow.payload.guideId);

    if (!removed) {
      await ctx.reply('Гайд не найден. Возможно, он уже был удалён.');
      await this.resetFlow(ctx);
      return;
    }

    const actorUsername = ctx.from?.username ? `@${ctx.from.username}` : `ID ${ctx.from?.id ?? 'неизвестен'}`;
    const safeActor = this.escapeHtml(actorUsername);
    const safeTitle = this.escapeHtml(removed.title);
    const notification = `Админ ${safeActor} удалил гайд «${safeTitle}».`;

    await this.adminService.notifyAdmins(this.bot, notification);

    await this.resetFlow(ctx);
    await ctx.reply(this.messages.guideDeleted);
  }

  /**
   * Retrieves current admin flow if it belongs to active user.
   * @param {import('grammy').Context & { session?: import('../types.js').BotSession }} ctx Grammy context.
   * @returns {import('../types.js').AdminFlowState | null}
   */
  getFlow(ctx) {
    const flow = ctx.session?.adminFlow ?? null;
    const fromId = ctx.from?.id;

    if (!flow || !fromId || flow.initiatorId !== fromId) {
      return null;
    }

    return flow;
  }

  /**
   * Resets admin flow.
   * @param {import('grammy').Context & { session: import('../types.js').BotSession }} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async resetFlow(ctx) {
    ctx.session ??= { adminFlow: null, menuMediaFlow: null, subscriptionAudit: null };
    ctx.session.adminFlow = null;
  }

  /**
   * Escapes text for safe usage in HTML messages.
   * @param {string} text Source text.
   * @returns {string}
   */
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
