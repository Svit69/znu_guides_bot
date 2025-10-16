import { AdminCommand } from '../AdminCommand.js';

/**
 * Initializes delete guide flow.
 */
export class DeleteGuideCommand extends AdminCommand {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../../services/AdminService.js').AdminService} params.adminService Admin service.
   * @param {import('../../admin/AdminFlowManager.js').AdminFlowManager} params.flowManager Admin flow manager.
   * @param {import('../../../core/Logger.js').Logger} [params.logger] Logger.
   */
  constructor({ adminService, flowManager, logger }) {
    super('delete', { adminService, logger });
    this.flowManager = flowManager;
  }

  /**
   * @override
   * @param {import('grammy').Context & { session: import('../../types.js').BotSession }} ctx Grammy context.
   */
  async execute(ctx) {
    await this.flowManager.startDeleteFlow(ctx);
  }
}
