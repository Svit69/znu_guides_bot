/**
 * Generic logging contract to allow dependency inversion.
 * @abstract
 */
export class Logger {
  /**
   * @param {string} message Message to log.
   * @param {...unknown} optionalParams Additional context to log.
   */
  // eslint-disable-next-line class-methods-use-this
  info(message, ...optionalParams) {
    throw new TypeError('Logger.info must be implemented by subclasses.');
  }

  /**
   * @param {string} message Message to log.
   * @param {...unknown} optionalParams Additional context to log.
   */
  // eslint-disable-next-line class-methods-use-this
  error(message, ...optionalParams) {
    throw new TypeError('Logger.error must be implemented by subclasses.');
  }
}

/**
 * Console-based logger implementation.
 */
export class ConsoleLogger extends Logger {
  info(message, ...optionalParams) {
    console.info(message, ...optionalParams);
  }

  error(message, ...optionalParams) {
    console.error(message, ...optionalParams);
  }
}
