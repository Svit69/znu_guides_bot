import { InlineKeyboard } from 'grammy';

/**
 * Service responsible for enforcing channel subscription before allowing access to guides.
 */
export class SubscriptionService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {string} [params.channelUsername] Channel username (with @) used for membership checks.
   * @param {string} [params.promptMessage] HTML message inviting the user to subscribe.
   * @param {string} [params.buttonText] Text for the inline button that re-checks subscription.
   * @param {string} [params.reminderMessage] HTML message sent if the user is not subscribed yet.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger instance.
   */
  constructor({ channelUsername, promptMessage, buttonText, reminderMessage, logger }) {
    /**
     * @private
     * @type {string}
     */
    this.channelUsername = channelUsername ?? '';

    /**
     * @private
     * @type {string}
     */
    this.promptMessage = promptMessage ?? '';

    /**
     * @private
     * @type {string}
     */
    this.buttonText = buttonText ?? '';

    /**
     * @private
     * @type {string}
     */
    this.reminderMessage = reminderMessage ?? this.promptMessage;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger | undefined}
     */
    this.logger = logger;

    /**
     * @private
     * @type {string}
     */
    this.callbackData = 'subscription_check';
  }

  /**
   * Indicates whether subscription enforcement is configured.
   * @returns {boolean}
   */
  isEnabled() {
    return Boolean(this.channelUsername && this.promptMessage && this.buttonText);
  }

  /**
   * Exposes callback data used to trigger subscription re-checks.
   * @returns {string}
   */
  getCallbackData() {
    return this.callbackData;
  }

  /**
   * Sends a subscription prompt with inline button.
   * @param {import('grammy').Context} ctx Grammy context.
   * @param {Object} [options] Additional options.
   * @param {boolean} [options.reminder=false] Whether to use reminder message instead of the default prompt.
   * @returns {Promise<void>}
   */
  async sendPrompt(ctx, { reminder = false } = {}) {
    if (!this.isEnabled()) {
      return;
    }

    const text = reminder ? this.reminderMessage : this.promptMessage;

    const keyboard = new InlineKeyboard().text(this.buttonText, this.callbackData);

    await ctx.reply(text, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: keyboard
    });
  }

  /**
   * Ensures the user is subscribed. Sends prompt if not subscribed.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<boolean>} True when the user is subscribed or enforcement is disabled.
   */
  async requireSubscription(ctx) {
    if (!this.isEnabled()) {
      return true;
    }

    const userId = ctx.from?.id;
    if (!userId) {
      this.logger?.error('Unable to determine user id for subscription check.');
      await ctx.reply('Не удалось определить пользователя для проверки подписки.');
      return false;
    }

    let subscribed;
    try {
      subscribed = await this.isUserSubscribed(ctx, userId);
    } catch (error) {
      this.logger?.error('Failed to verify subscription status.', error);
      await ctx.reply('Не удалось проверить подписку. Пожалуйста, попробуйте еще раз позже.');
      return false;
    }

    if (subscribed) {
      return true;
    }

    await this.sendPrompt(ctx, { reminder: true });
    return false;
  }

  /**
   * Processes callback query triggered by subscription check button.
   * @param {import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Callback context.
   * @returns {Promise<boolean>} True if the user is subscribed.
   */
  async handleCallback(ctx) {
    await ctx.answerCallbackQuery();

    if (!this.isEnabled()) {
      return true;
    }

    const subscribed = await this.requireSubscription(ctx);
    return subscribed;
  }

  /**
   * Verifies subscription status using Telegram API.
   * @param {import('grammy').Context | import('grammy').CallbackQueryContext<import('grammy').Context>} ctx Grammy context.
   * @param {number} userId Telegram user identifier.
   * @returns {Promise<boolean>}
   */
  async isUserSubscribed(ctx, userId) {
    if (!this.channelUsername) {
      this.logger?.error('Subscription channel username is not configured.');
      return true;
    }

    try {
      const member = await ctx.api.getChatMember(this.channelUsername, userId);
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
}

