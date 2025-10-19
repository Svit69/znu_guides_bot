import { InlineKeyboard } from 'grammy';
import { CommandHandler } from '../../core/CommandHandler.js';

/**
 * Handles the /start command.
 */
export class StartCommand extends CommandHandler {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../services/GuideService.js').GuideService} params.guideService Guide service used to list guides.
   * @param {{ noGuides: string }} params.messages Shared user messages.
   * @param {import('../services/SubscriptionService.js').SubscriptionService} [params.subscriptionService] Subscription service.
   * @param {import('../services/MenuMediaService.js').MenuMediaService} [params.menuMediaService] Menu media service.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ guideService, messages, subscriptionService, menuMediaService, logger }) {
    super('start');
    this.guideService = guideService;
    this.messages = messages;
    this.subscriptionService = subscriptionService ?? null;
    this.menuMediaService = menuMediaService ?? null;
    this.logger = logger;
  }

  /**
   * @override
   * @param {import('grammy').Bot} bot Telegram bot instance.
   */
  register(bot) {
    super.register(bot);

    bot.callbackQuery('consent_accept', async (ctx) => this.handleConsentAccept(ctx));
    bot.callbackQuery('consent_decline', async (ctx) => this.handleConsentDecline(ctx));

    const subscriptionCallback = this.subscriptionService?.getCallbackData();
    if (subscriptionCallback) {
      bot.callbackQuery(subscriptionCallback, async (ctx) => {
        try {
          const subscribed = await this.subscriptionService.handleCallback(ctx);
          if (subscribed) {
            await this.sendGuidesMenu(ctx);
          }
        } catch (error) {
          this.logger?.error('Failed to process subscription callback.', error);
          await ctx.reply(this.messages.noGuides);
        }
      });
    }
  }

  /**
   * Sends a greeting message to the user.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async execute(ctx) {
    const message = [
      'Мы бережно относимся к вашим данным 💚',
      'Подтвердите своё согласие на получение информационных и маркетинговых сообщений, а также на обработку персональных данных в соответствии с нашими документами:',
      '',
      '• <a href="https://zagorodom96.ru/privacy">Политика конфиденциальности</a>',
      '• <a href="https://mantsova.tilda.ws/soglasie">Согласие на получение информационных сообщений</a>',
      '• <a href="https://mantsova.tilda.ws/oferta">Договор оферты</a>'
    ].join('\n');

    const keyboard = new InlineKeyboard()
      .text('Соглашаюсь', 'consent_accept')
      .text('Не соглашаюсь', 'consent_decline');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }

  /**
   * Handles consent acceptance.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy callback context.
   * @returns {Promise<void>}
   */
  async handleConsentAccept(ctx) {
    try {
      await ctx.answerCallbackQuery();

      if (this.subscriptionService?.isEnabled()) {
        await this.subscriptionService.sendPrompt(ctx);
        return;
      }

      await this.sendGuidesMenu(ctx);
    } catch (error) {
      this.logger?.error('Failed to process consent accept.', error);
      await ctx.reply(this.messages.noGuides);
    }
  }

  /**
   * Handles consent decline by showing an alert.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy callback context.
   * @returns {Promise<void>}
   */
  async handleConsentDecline(ctx) {
    await ctx.answerCallbackQuery({
      text: 'Дальнейшее прохождение бота ограничено.',
      show_alert: true
    });
  }

  /**
   * Sends guides selection inline keyboard to the user.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async sendGuidesMenu(ctx) {
    const guides = await this.guideService.listAvailableGuides();

    if (!guides.length) {
      await ctx.reply(this.messages.noGuides);
      return;
    }

    const keyboard = new InlineKeyboard();
    guides.forEach((guide) => {
      keyboard.text(guide.title, `guide:${guide.id}`).row();
    });

    let mediaSent = false;
    if (this.menuMediaService) {
      mediaSent = await this.menuMediaService.sendMenuMedia(ctx, {
        replyMarkup: keyboard
      });
    }

    if (!mediaSent) {
      await ctx.reply('Выберите гайд:', {
        reply_markup: keyboard
      });
    }
  }
}
