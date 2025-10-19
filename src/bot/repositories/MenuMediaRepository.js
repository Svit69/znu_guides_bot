import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Provides persistence for menu media configuration.
 */
export class MenuMediaRepository {
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
     * @type {import('../../core/Logger.js').Logger | undefined}
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
   * @returns {Promise<Object | null>}
   */
  async read() {
    try {
      const content = await readFile(this.storagePath, 'utf-8');
      const data = JSON.parse(content);
      return data && typeof data === 'object' ? data : null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }

      this.logger?.error('Failed to read menu media storage.', error);
      throw error;
    }
  }

  /**
   * Writes raw data into storage.
   * @param {Object | null} media Menu media payload to persist.
   * @returns {Promise<void>}
   */
  async write(media) {
    await this.ensureStorageDir();
    const payload = JSON.stringify(media, null, 2);
    await writeFile(this.storagePath, payload, 'utf-8');
  }

  /**
   * Retrieves stored menu media value.
   * @returns {Promise<Object | null>}
   */
  async get() {
    return this.read();
  }

  /**
   * Persists menu media value.
   * @param {Object | null} media Media payload.
   * @returns {Promise<void>}
   */
  async save(media) {
    await this.write(media);
  }
}

