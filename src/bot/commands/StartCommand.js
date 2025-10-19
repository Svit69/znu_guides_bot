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
 * @param {{
 *   channelUsername?: string,
 *   channelLink?: string,
 *   promptMessage?: string,
 *   buttonText?: string,
 *   reminderMessage?: string
 * }} params.subscription Subscription enforcement settings.
 * @param {import('../../core/Logger.js').Logger} [params.logger] Logger.
 */
  constructor({ guideService, messages, subscription, logger }) {
    super('start');
    this.guideService = guideService;
    this.messages = messages;
    this.subscription = subscription ?? null;
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
    bot.callbackQuery('subscription_check', async (ctx) => this.handleSubscriptionCheck(ctx));
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
      await this.sendSubscriptionPrompt(ctx);
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
   * Sends subscription prompt to the user.
   * @param {import('grammy').Context} ctx Grammy context.
   * @param {string} [textOverride] Optional text to send instead of the default prompt.
   * @returns {Promise<void>}
   */
  async sendSubscriptionPrompt(ctx, textOverride) {
    const promptText = textOverride ?? this.subscription?.promptMessage;
    const buttonText = this.subscription?.buttonText;

    if (!promptText || !buttonText) {
      await this.sendGuidesMenu(ctx);
      return;
    }

    const keyboard = new InlineKeyboard().text(buttonText, 'subscription_check');

    await ctx.reply(promptText, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }

  /**
   * Handles subscription check callback.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy callback context.
   * @returns {Promise<void>}
   */
  async handleSubscriptionCheck(ctx) {
    await ctx.answerCallbackQuery();

    const channelUsername = this.subscription?.channelUsername;
    const userId = ctx.from?.id;

    if (!channelUsername) {
      this.logger?.error('Subscription channel username is not configured.');
      await this.sendGuidesMenu(ctx);
      return;
    }

    if (!userId) {
      this.logger?.error('Unable to determine user id for subscription check.');
      await ctx.reply(this.messages.noGuides);
      return;
    }

    let isSubscribed;
    try {
      isSubscribed = await this.isUserSubscribed(ctx, channelUsername, userId);
    } catch (error) {
      this.logger?.error('Failed to verify subscription status.', error);
      await ctx.reply('Не удалось проверить подписку. Пожалуйста, попробуйте еще раз позже.');
      return;
    }

    if (isSubscribed) {
      await this.sendGuidesMenu(ctx);
      return;
    }

    const reminderText =
      this.subscription?.reminderMessage ??
      'Подпишитесь, пожалуйста, на канал, чтобы получить доступ к гайдам.';

    await this.sendSubscriptionPrompt(ctx, reminderText);
  }

  /**
   * Determines whether user is subscribed to the configured channel.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy callback context.
   * @param {string} channelUsername Target channel username or identifier.
   * @param {number} userId Telegram user identifier.
   * @returns {Promise<boolean>}
   */
  async isUserSubscribed(ctx, channelUsername, userId) {
    try {
      const member = await ctx.api.getChatMember(channelUsername, userId);
      return this.isActiveMember(member);
    } catch (error) {
      if (this.isUserMissingError(error)) {
        return false;
      }

      throw error;
    }
  }

  /**
   * Checks whether chat member should be treated as subscribed.
   * @param {object} [member] Chat member info.
   * @returns {boolean}
   */
  // eslint-disable-next-line class-methods-use-this
  isActiveMember(member) {
    if (!member) {
      return false;
    }

    const { status } = member;

    if (status === 'restricted') {
      return 'is_member' in member ? Boolean(member.is_member) : false;
    }

    return status === 'creator' || status === 'administrator' || status === 'member';
  }

  /**
   * Detects whether API error indicates absence of the user in the channel.
   * @param {unknown} error Error thrown by Telegram API.
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

    await ctx.reply('Какой гайд вы бы хотели получить?', {
      reply_markup: keyboard
    });
  }
}
