import { InlineKeyboard } from 'grammy';
import { CommandHandler } from '../../core/CommandHandler.js';

/**
 * Handles the /get command to show available guides.
 */
export class GetGuidesCommand extends CommandHandler {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../services/GuideService.js').GuideService} params.guideService Domain service providing guide metadata.
 * @param {{ noGuides: string }} params.messages Message catalog for user facing texts.
 * @param {import('../services/SubscriptionService.js').SubscriptionService} [params.subscriptionService] Subscription enforcement service.
 * @param {import('../../core/Logger.js').Logger} [params.logger] Structured logger.
 */
  constructor({ guideService, messages, subscriptionService, logger }) {
    super('get');
    this.guideService = guideService;
    this.messages = messages;
    this.subscriptionService = subscriptionService ?? null;
    this.logger = logger;
  }

  /**
   * Registers command and callback handling.
   * @override
   * @param {import('grammy').Bot} bot Telegram bot instance.
   */
  register(bot) {
    super.register(bot);
    bot.callbackQuery(/guide:(.+)/, async (ctx) => this.handleGuideSelection(ctx));
  }

  /**
   * Sends inline keyboard with available guides or a fallback message.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async execute(ctx) {
    try {
      if (this.subscriptionService?.isEnabled()) {
        const subscribed = await this.subscriptionService.requireSubscription(ctx);
        if (!subscribed) {
          return;
        }
      }

      const guides = await this.guideService.listAvailableGuides();

      if (!guides.length) {
        await ctx.reply(this.messages.noGuides);
        return;
      }

      const keyboard = new InlineKeyboard();
      guides.forEach((guide) => {
        keyboard.text(guide.title, `guide:${guide.id}`).row();
      });

      await ctx.reply('Какой гайд вы бы хотели получить?', {
        reply_markup: keyboard
      });
    } catch (error) {
      this.logger?.error('Unable to provide guides for /get command.', error);
      await ctx.reply(this.messages.noGuides);
    }
  }

  /**
   * Sends the selected guide document to the user.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy context for callback queries.
   * @returns {Promise<void>}
   */
  async handleGuideSelection(ctx) {
    try {
      if (this.subscriptionService?.isEnabled()) {
        const subscribed = await this.subscriptionService.requireSubscription(ctx);
        if (!subscribed) {
          await ctx.answerCallbackQuery({
            text: 'Подписка на канал необходима для доступа к гайдам.',
            show_alert: true
          });
          return;
        }
      }

      const guideId = ctx.match?.[1];
      if (!guideId) {
        await ctx.answerCallbackQuery({
          text: 'Не удалось определить выбранный гайд. Попробуйте снова.',
          show_alert: true
        });
        return;
      }

      const guide = await this.guideService.getGuideById(guideId);
      if (!guide) {
        await ctx.answerCallbackQuery({
          text: 'Гайд недоступен. Попробуйте позже.',
          show_alert: true
        });
        return;
      }

      await ctx.answerCallbackQuery();
      await ctx.replyWithDocument(guide.fileId, {
        caption: guide.title
      });
    } catch (error) {
      this.logger?.error('Failed to send guide to user.', error);
      await ctx.answerCallbackQuery({
        text: 'Произошла ошибка. Попробуйте позже.',
        show_alert: true
      });
      await ctx.reply(this.messages.noGuides);
    }
  }
}
