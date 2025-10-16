/**
 * Base application contract that enforces lifecycle operations.
 * @abstract
 */
export class Application {
  /**
   * @param {Object} dependencies Cross-cutting dependencies.
   * @param {import('../core/Logger.js').Logger} [dependencies.logger] Logger implementation.
   */
  constructor({ logger } = {}) {
    if (new.target === Application) {
      throw new TypeError('Application is an abstract class and cannot be instantiated directly.');
    }

    /**
     * @protected
     * @type {import('../core/Logger.js').Logger}
     */
    this.logger = logger;
  }

  /**
   * Initializes and starts the application.
   * @abstract
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this
  async start() {
    throw new TypeError('Classes extending Application must implement start().');
  }

  /**
   * Stops the application.
   * @abstract
   * @returns {Promise<void>}
   */
  // eslint-disable-next-line class-methods-use-this
  async stop() {
    throw new TypeError('Classes extending Application must implement stop().');
  }
}
