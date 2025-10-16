import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Provides persistence for guide entities.
 */
export class GuideRepository {
  /**
   * @param {Object} params Constructor parameters.
   * @param {string} params.storagePath Absolute path to the storage file.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger implementation.
   */
  constructor({ storagePath, logger }) {
    /**
     * @private
     * @type {string}
     */
    this.storagePath = storagePath;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger}
     */
    this.logger = logger;
  }

  /**
   * Ensures the storage directory exists.
   * @returns {Promise<void>}
   */
  async ensureStorageDir() {
    const directory = dirname(this.storagePath);
    await mkdir(directory, { recursive: true });
  }

  /**
   * Reads raw data from storage.
   * @returns {Promise<Object[]>}
   */
  async read() {
    try {
      const content = await readFile(this.storagePath, 'utf-8');
      const data = JSON.parse(content);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }

      this.logger?.error('Failed to read guides storage.', error);
      throw error;
    }
  }

  /**
   * Writes raw guide data into storage.
   * @param {Object[]} guides Guides collection to persist.
   * @returns {Promise<void>}
   */
  async write(guides) {
    await this.ensureStorageDir();
    const payload = JSON.stringify(guides, null, 2);
    await writeFile(this.storagePath, payload, 'utf-8');
  }

  /**
   * Retrieves all guides from storage.
   * @returns {Promise<Array<{id: string, title: string, fileId: string, createdAt?: string}>>}
   */
  async findAll() {
    return this.read();
  }

  /**
   * Persists entire guides collection.
   * @param {Array<{id: string, title: string, fileId: string, createdAt?: string}>} guides Guides collection.
   * @returns {Promise<void>}
   */
  async saveAll(guides) {
    await this.write(guides);
  }
}
