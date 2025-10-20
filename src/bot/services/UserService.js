/**
 * Service responsible for tracking registered bot users.
 */
export class UserService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../repositories/UserRepository.js').UserRepository} params.repository Repository providing persistence.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger instance.
   */
  constructor({ repository, logger }) {
    /**
     * @private
     * @type {import('../repositories/UserRepository.js').UserRepository}
     */
    this.repository = repository;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger | undefined}
     */
    this.logger = logger;
  }

  /**
   * Registers user if not registered yet.
   * @param {{ id?: number, username?: string, first_name?: string, last_name?: string, language_code?: string }} from Telegram "from" payload.
   * @returns {Promise<void>}
   */
  async registerUser(from) {
    if (!from?.id) {
      this.logger?.error('Attempted to register user without id.');
      return;
    }

    const users = await this.repository.findAll();
    const exists = users.some((user) => user.id === from.id);

    if (exists) {
      return;
    }

    users.push({
      id: from.id,
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      languageCode: from.language_code,
      registeredAt: new Date().toISOString()
    });

    await this.repository.saveAll(users);
  }

  /**
   * Lists all registered users.
   * @returns {Promise<Array<{ id: number, username?: string, firstName?: string, lastName?: string, languageCode?: string, registeredAt?: string }>>}
   */
  async listUsers() {
    return this.repository.findAll();
  }
}

