import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Provides persistence for registered bot users.
 */
export class UserRepository {
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
   * Reads registered users collection from storage.
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

      this.logger?.error('Failed to read users storage.', error);
      throw error;
    }
  }

  /**
   * Writes registered users collection to storage.
   * @param {Object[]} users Users collection to persist.
   * @returns {Promise<void>}
   */
  async write(users) {
    await this.ensureStorageDir();
    const payload = JSON.stringify(users, null, 2);
    await writeFile(this.storagePath, payload, 'utf-8');
  }

  /**
   * Retrieves all users from storage.
   * @returns {Promise<Array<{ id: number, username?: string, firstName?: string, lastName?: string, languageCode?: string, registeredAt?: string }>>}
   */
  async findAll() {
    return this.read();
  }

  /**
   * Persists entire users collection.
   * @param {Array<Object>} users Users collection.
   * @returns {Promise<void>}
   */
  async saveAll(users) {
    await this.write(users);
  }
}

