import { AdminCommand } from '../AdminCommand.js';

const escapeHtml = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Shows all guides for administrative purposes.
 */
export class ShowGuidesCommand extends AdminCommand {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Admin service.
   * @param {import('../../services/GuideService.js').GuideService} params.guideService Guide service.
   * @param {{ noGuides: string }} params.messages Shared messages.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ adminService, guideService, messages, logger }) {
    super('show_guides', { adminService, logger });
    this.guideService = guideService;
    this.messages = messages;
  }

  /**
   * @override
   * @param {import('grammy').Context} ctx Grammy context.
   */
  async execute(ctx) {
    const guides = await this.guideService.listAllGuides();

    if (!guides.length) {
      await ctx.reply(this.messages.noGuides);
      return;
    }

    const listing = guides
      .map((guide) => `${guide.id} | ${guide.title}`)
      .map((line) => escapeHtml(line))
      .join('\n');

    await ctx.reply(
      ['Список гайдов:', `<pre>${listing}</pre>`].join('\n'),
      { parse_mode: 'HTML' }
    );
  }
}
