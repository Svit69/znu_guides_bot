import { AdminCommand } from '../AdminCommand.js';

/**
 * Handles /image_menu command allowing admins to configure menu media.
 */
export class ImageMenuCommand extends AdminCommand {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Admin service.
   * @param {import('../../services/MenuMediaService.js').MenuMediaService} params.menuMediaService Menu media service.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ adminService, menuMediaService, logger }) {
    super('image_menu', { adminService, logger });
    this.menuMediaService = menuMediaService;
  }

  /**
   * @override
   * @param {import('grammy').Bot} bot Telegram bot instance.
   */
  register(bot) {
    super.register(bot);

    bot.on('message:photo', async (ctx, next) => {
      const handled = await this.handlePhoto(ctx);
      if (!handled && next) {
        await next();
      }
    });

    bot.on('message:video', async (ctx, next) => {
      const handled = await this.handleVideo(ctx);
      if (!handled && next) {
        await next();
      }
    });
  }

  /**
   * @override
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Grammy context.
   */
  async execute(ctx) {
    ctx.session ??= { adminFlow: null, menuMediaFlow: null };
    ctx.session.menuMediaFlow = {
      awaitingMedia: true,
      initiatorId: ctx.from?.id ?? 0
    };

    await ctx.reply(
      [
        'Пожалуйста, отправьте изображение или видео, которое будет отображаться перед меню с гайдами.',
        'Можно добавить подпись к медиасообщению — она сохранится вместе с файлом.',
        'Для отмены отправьте команду /cancel.'
      ].join('\n')
    );
  }

  /**
   * Processes photo attachments.
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Grammy context.
   * @returns {Promise<boolean>} True when photo was processed.
   */
  async handlePhoto(ctx) {
    if (!this.isAwaitingMedia(ctx)) {
      return false;
    }

    const photos = ctx.message?.photo;
    const file = photos && photos.length ? photos[photos.length - 1] : null;

    if (!file?.file_id) {
      await ctx.reply('Не удалось получить файл изображения. Попробуйте отправить его ещё раз.');
      return true;
    }

    await this.persistMedia(ctx, {
      type: 'photo',
      fileId: file.file_id,
      caption: ctx.message?.caption
    });

    return true;
  }

  /**
   * Processes video attachments.
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Grammy context.
   * @returns {Promise<boolean>} True when video was processed.
   */
  async handleVideo(ctx) {
    if (!this.isAwaitingMedia(ctx)) {
      return false;
    }

    const video = ctx.message?.video;

    if (!video?.file_id) {
      await ctx.reply('Не удалось получить видеофайл. Попробуйте отправить его ещё раз.');
      return true;
    }

    await this.persistMedia(ctx, {
      type: 'video',
      fileId: video.file_id,
      caption: ctx.message?.caption
    });

    return true;
  }

  /**
   * Persists media metadata and resets the flow.
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Grammy context.
   * @param {{ type: 'photo' | 'video', fileId: string, caption?: string }} payload Media payload.
   * @returns {Promise<void>}
   */
  async persistMedia(ctx, payload) {
    try {
      await this.menuMediaService.updateMenuMedia({
        ...payload,
        updatedBy: ctx.from?.id
      });
      await ctx.reply('Медиа успешно сохранено и будет показываться перед меню с гайдами.');
    } catch (error) {
      this.logger?.error('Failed to save menu media.', error);
      await ctx.reply('Не удалось сохранить медиафайл. Попробуйте позже или обратитесь к разработчику.');
    } finally {
      if (ctx.session) {
        ctx.session.menuMediaFlow = null;
      }
    }
  }

  /**
   * Checks whether current user is expected to send media.
   * @param {import('grammy').Context & { session?: import('../../types.js').BotSession }} ctx Grammy context.
   * @returns {boolean}
   */
  isAwaitingMedia(ctx) {
    const flow = ctx.session?.menuMediaFlow;
    const fromId = ctx.from?.id;
    return Boolean(flow?.awaitingMedia && fromId && flow.initiatorId === fromId);
  }
}
