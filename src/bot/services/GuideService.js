/**
 * Domain service responsible for retrieving guide metadata.
 */
export class GuideService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {{ guides?: Array<{id: string, title: string, fileId: string}> }} [params.config] Application configuration or subset with guides.
   * @param {() => Promise<Array<{id: string, title: string, fileId: string}>>} [params.fetchGuides] Custom data source, e.g., database call.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Structured logger.
   */
  constructor({ config, fetchGuides, logger } = {}) {
    /**
     * @private
     * @type {() => Promise<Array<{id: string, title: string, fileId: string}>>}
     */
    this.fetchGuides = fetchGuides ?? (async () => config?.guides ?? []);

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;
  }

  /**
   * Retrieves all guides that have ready-to-send file identifiers.
   * @returns {Promise<Array<{id: string, title: string, fileId: string}>>}
   */
  async listAvailableGuides() {
    try {
      const guides = await this.fetchGuides();
      return guides.filter((guide) => Boolean(guide.fileId));
    } catch (error) {
      this.logger?.error('Failed to load guides.', error);
      throw error;
    }
  }

  /**
   * Finds a guide by its identifier.
   * @param {string} id Guide identifier.
   * @returns {Promise<{id: string, title: string, fileId: string} | null>}
   */
  async getGuideById(id) {
    const guides = await this.listAvailableGuides();
    return guides.find((guide) => guide.id === id) ?? null;
  }
}
