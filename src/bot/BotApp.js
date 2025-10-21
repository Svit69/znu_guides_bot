import { Bot, session } from 'grammy';
import { Application } from '../core/Application.js';
import { ConsoleLogger } from '../core/Logger.js';
import { CommandRegistry } from './CommandRegistry.js';
import { StartCommand } from './commands/StartCommand.js';
import { GetGuidesCommand } from './commands/GetGuidesCommand.js';
import { GuideService } from './services/GuideService.js';
import { GuideRepository } from './repositories/GuideRepository.js';
import { AdminService } from './services/AdminService.js';
import { SubscriptionService } from './services/SubscriptionService.js';
import { MenuMediaService } from './services/MenuMediaService.js';
import { MenuMediaRepository } from './repositories/MenuMediaRepository.js';
import { UserService } from './services/UserService.js';
import { UserRepository } from './repositories/UserRepository.js';
import { AdminFlowManager } from './admin/AdminFlowManager.js';
import { AdminMenuCommand } from './commands/admin/AdminMenuCommand.js';
import { ShowGuidesCommand } from './commands/admin/ShowGuidesCommand.js';
import { AddGuideCommand } from './commands/admin/AddGuideCommand.js';
import { DeleteGuideCommand } from './commands/admin/DeleteGuideCommand.js';
import { ImageMenuCommand } from './commands/admin/ImageMenuCommand.js';
import { ListUsersCommand } from './commands/admin/ListUsersCommand.js';
import { CheckChannelCommand } from './commands/admin/CheckChannelCommand.js';

/**
 * Orchestrates bot initialization and lifecycle.
 */
export class BotApp extends Application {
  /**
   * @param {Object} params Constructor parameters.
   * @param {typeof import('../config.js').config} params.config Application configuration.
   * @param {import('grammy').Bot} [params.bot] Preconfigured bot instance (useful for testing).
   * @param {CommandRegistry} [params.commandRegistry] Optional registry instance.
   * @param {import('../core/Logger.js').Logger} [params.logger] Custom logger implementation.
   * @param {GuideService} [params.guideService] Guide metadata service.
   * @param {GuideRepository} [params.guideRepository] Guides repository.
   * @param {AdminService} [params.adminService] Administrator service.
   * @param {SubscriptionService} [params.subscriptionService] Subscription enforcement service.
   * @param {MenuMediaService} [params.menuMediaService] Menu media service.
   * @param {MenuMediaRepository} [params.menuMediaRepository] Menu media repository.
   * @param {UserService} [params.userService] User registry service.
   * @param {UserRepository} [params.userRepository] User repository.
   * @param {AdminFlowManager} [params.adminFlowManager] Admin flow manager.
   */
  constructor({
    config,
    bot,
    commandRegistry,
    logger,
    guideService,
    guideRepository,
    adminService,
    subscriptionService,
    menuMediaService,
    menuMediaRepository,
    userService,
    userRepository,
    adminFlowManager
  }) {
    super({ logger: logger ?? new ConsoleLogger() });

    /**
     * @private
     * @type {typeof import('../config.js').config}
     */
    this.config = config;

    /**
     * @private
     * @type {import('grammy').Bot}
     */
    this.bot = bot ?? new Bot(config.botToken);

    /**
     * @private
     * @type {CommandRegistry}
     */
    this.commandRegistry = commandRegistry ?? new CommandRegistry(this.bot);

    /**
     * @private
     * @type {GuideRepository}
     */
    this.guideRepository =
      guideRepository ??
      new GuideRepository({
        storagePath: this.config.storage.guidesFile,
        logger: this.logger
      });

    /**
     * @private
     * @type {GuideService}
     */
    this.guideService =
      guideService ??
      new GuideService({
        repository: this.guideRepository,
        initialGuides: this.config.guides,
        logger: this.logger
      });

    /**
     * @private
     * @type {AdminService}
     */
    this.adminService =
      adminService ??
      new AdminService({
        adminIds: this.config.admins,
        messages: { adminOnly: this.config.messages.adminOnly },
        logger: this.logger
      });

    /**
     * @private
     * @type {SubscriptionService}
     */
    this.subscriptionService =
      subscriptionService ??
      new SubscriptionService({
        channelUsername: this.config.subscription?.channelUsername,
        promptMessage: this.config.subscription?.promptMessage,
        buttonText: this.config.subscription?.buttonText,
        reminderMessage: this.config.subscription?.reminderMessage,
        logger: this.logger
      });

    /**
     * @private
     * @type {MenuMediaRepository}
     */
    this.menuMediaRepository =
      menuMediaRepository ??
      new MenuMediaRepository({
        storagePath: this.config.storage.menuMediaFile,
        logger: this.logger
      });

    /**
     * @private
     * @type {MenuMediaService}
     */
    this.menuMediaService =
      menuMediaService ??
      new MenuMediaService({
        repository: this.menuMediaRepository,
        logger: this.logger
      });

    /**
     * @private
     * @type {UserRepository}
     */
    this.userRepository =
      userRepository ??
      new UserRepository({
        storagePath: this.config.storage.usersFile,
        logger: this.logger
      });

    /**
     * @private
     * @type {UserService}
     */
    this.userService =
      userService ??
      new UserService({
        repository: this.userRepository,
        logger: this.logger
      });

    /**
     * @private
     * @type {AdminFlowManager}
     */
    this.adminFlowManager =
      adminFlowManager ??
      new AdminFlowManager({
        guideService: this.guideService,
        adminService: this.adminService,
        logger: this.logger,
        messages: {
          guideAdded: this.config.messages.guideAdded,
          guideDeleted: this.config.messages.guideDeleted,
          nothingToConfirm: this.config.messages.nothingToConfirm,
          flowCancelled: this.config.messages.flowCancelled,
          noGuides: this.config.messages.noGuides
        }
      });

    /**
     * @private
     * @type {boolean}
     */
    this.running = false;

    /**
     * @private
     * @type {boolean}
     */
    this.middlewaresConfigured = false;
  }

  /**
   * Registers middleware stack for the bot.
   */
  configureMiddlewares() {
    if (this.middlewaresConfigured) {
      return;
    }

    this.bot.use(
      session({
        initial: () => ({
          adminFlow: null,
          menuMediaFlow: null,
          subscriptionAudit: null
        })
      })
    );

    this.adminFlowManager.register(this.bot);

    this.middlewaresConfigured = true;
  }

  /**
   * Configures command menus visible to users and administrators.
   * @returns {Promise<void>}
   */
  async configureCommands() {
    const userCommands = [
      { command: 'start', description: 'Информация о возможностях бота' },
      { command: 'get', description: 'Получить доступ к гайдам' }
    ];

    await this.bot.api.setMyCommands(userCommands);

    if (!this.config.admins.length) {
      return;
    }

    const adminCommands = [
      ...userCommands,
      { command: 'admin', description: 'справка по админ-командам' },
      { command: 'show_guides', description: 'перечень загруженных гайдов' },
      { command: 'add', description: 'добавить новый гайд' },
      { command: 'users', description: 'список зарегистрированных пользователей' },
      { command: 'check_channel', description: 'проверить подписку на t.me/goalevaya' },
      { command: 'image_menu', description: 'управление изображениями меню' },
      { command: 'delete', description: 'удалить гайд' },
      { command: 'confirm', description: 'подтвердить последнее действие' },
      { command: 'cancel', description: 'отменить активный процесс' }
    ];

    for (const adminId of this.config.admins) {
      try {
        await this.bot.api.setMyCommands(adminCommands, {
          scope: {
            type: 'chat',
            chat_id: adminId
          },
        });
      } catch (error) {
        this.logger?.error(`Failed to set admin commands for ${adminId}.`, error);
      }
    }
  }

  /**
   * Registers all command handlers with the bot instance.
   */
  registerCommands() {
    this.commandRegistry.register(
      new StartCommand({
        guideService: this.guideService,
        messages: this.config.messages,
        subscriptionService: this.subscriptionService,
        menuMediaService: this.menuMediaService,
        userService: this.userService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new GetGuidesCommand({
        guideService: this.guideService,
        messages: this.config.messages,
        subscriptionService: this.subscriptionService,
        menuMediaService: this.menuMediaService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new AdminMenuCommand({
        adminService: this.adminService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new ShowGuidesCommand({
        adminService: this.adminService,
        guideService: this.guideService,
        messages: this.config.messages,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new AddGuideCommand({
        adminService: this.adminService,
        flowManager: this.adminFlowManager,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new ListUsersCommand({
        adminService: this.adminService,
        userService: this.userService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new CheckChannelCommand({
        adminService: this.adminService,
        subscriptionService: this.subscriptionService,
        userService: this.userService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new ImageMenuCommand({
        adminService: this.adminService,
        menuMediaService: this.menuMediaService,
        logger: this.logger
      })
    );
    this.commandRegistry.register(
      new DeleteGuideCommand({
        adminService: this.adminService,
        flowManager: this.adminFlowManager,
        logger: this.logger
      })
    );
  }

  /**
   * Starts the bot using long polling.
   * @returns {Promise<void>}
   */
  async start() {
    if (this.running) {
      this.logger?.info('Bot is already running.');
      return;
    }

    this.configureMiddlewares();
    this.registerCommands();
    await this.guideService.ensureSeeded();
    await this.configureCommands();

    await this.bot.start({
      allowed_updates: this.config.polling.allowedUpdates,
      onStart: (info) => {
        this.logger?.info(`Bot started as @${info.username}.`);
      }
    });

    this.running = true;
  }

  /**
   * Stops the bot if it is running.
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.running) {
      return;
    }

    this.bot.stop();
    this.running = false;
    this.logger?.info('Bot stopped.');
  }
}

