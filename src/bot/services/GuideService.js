import { randomUUID } from 'node:crypto';

/**
 * Domain service responsible for guide operations.
 */
export class GuideService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../repositories/GuideRepository.js').GuideRepository} params.repository Repository providing persistence.
   * @param {Array<{id: string, title: string, fileId: string}>} [params.initialGuides] Guides used for initial seeding.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Structured logger.
   */
  constructor({ repository, initialGuides = [], logger }) {
    /**
     * @private
     * @type {import('../repositories/GuideRepository.js').GuideRepository}
     */
    this.repository = repository;

    /**
     * @private
     * @type {Array<{id: string, title: string, fileId: string}>}
     */
    this.initialGuides = initialGuides;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;

    /**
     * @private
     * @type {boolean}
     */
    this.seeded = false;
  }

  /**
   * Seeds guides storage if it is empty.
   * @returns {Promise<void>}
   */
  async ensureSeeded() {
    if (this.seeded) {
      return;
    }

    const existing = await this.repository.findAll();

    if (!existing.length && this.initialGuides.length) {
      const payload = this.initialGuides
        .filter((guide) => guide.title?.trim())
        .map((guide) => ({
          id: guide.id ?? randomUUID(),
          title: guide.title,
          fileId: guide.fileId ?? '',
          createdAt: new Date().toISOString()
        }));

      if (payload.length) {
        await this.repository.saveAll(payload);
      }
    }

    this.seeded = true;
  }

  /**
   * Retrieves every guide from storage.
   * @returns {Promise<Array<{id: string, title: string, fileId: string, createdAt?: string}>>}
   */
  async listAllGuides() {
    await this.ensureSeeded();
    return this.repository.findAll();
  }

  /**
   * Retrieves guides that can be sent to users (i.e. have file identifiers).
   * @returns {Promise<Array<{id: string, title: string, fileId: string}>>}
   */
  async listAvailableGuides() {
    const guides = await this.listAllGuides();
    return guides.filter((guide) => Boolean(guide.fileId));
  }

  /**
   * Finds a guide by its identifier.
   * @param {string} id Guide identifier.
   * @returns {Promise<{id: string, title: string, fileId: string} | null>}
   */
  async getGuideById(id) {
    const guides = await this.listAllGuides();
    return guides.find((guide) => guide.id === id) ?? null;
  }

  /**
   * Adds guide to storage.
   * @param {{ title: string, fileId: string }} payload Guide details.
   * @returns {Promise<{id: string, title: string, fileId: string}>}
   */
  async createGuide(payload) {
    const guides = await this.listAllGuides();
    const guide = {
      id: randomUUID(),
      title: payload.title,
      fileId: payload.fileId,
      createdAt: new Date().toISOString()
    };

    guides.push(guide);
    await this.repository.saveAll(guides);
    return guide;
  }

  /**
   * Deletes guide by identifier.
   * @param {string} id Guide identifier.
   * @returns {Promise<{id: string, title: string, fileId: string} | null>}
   */
  async deleteGuide(id) {
    const guides = await this.listAllGuides();
    const index = guides.findIndex((guide) => guide.id === id);

    if (index === -1) {
      return null;
    }

    const [removed] = guides.splice(index, 1);
    await this.repository.saveAll(guides);
    return removed;
  }
}
