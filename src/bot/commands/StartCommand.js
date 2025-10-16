import { CommandHandler } from '../../core/CommandHandler.js';

/**
 * Handles the /start command.
 */
export class StartCommand extends CommandHandler {
  constructor() {
    super('start');
  }

  /**
   * Sends a greeting message to the user.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<void>}
   */
  async execute(ctx) {
    const message = [
      'Перед тем как мы поделимся полезными материалами, прошу подтвердить своё согласие на получение',
      '<a href="https://mantsova.tilda.ws/soglasie">информационных и маркетинговых сообщений</a> от нас,',
      'а также на обработку персональных данных в соответствии с',
      '<a href="https://zagorodom96.ru/privacy">Политикой конфиденциальности</a> и',
      '<a href="https://mantsova.tilda.ws/oferta">Договором оферты</a>.',
      '',
      'Нажимая /start, вы подтверждаете своё согласие.'
    ].join('\n');

    await ctx.reply(message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
  }
}
