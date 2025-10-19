/**
 * Service responsible for storing and delivering menu media.
 */
export class MenuMediaService {
  /**
   * @param {Object} params Constructor parameters.
   * @param {import('../repositories/MenuMediaRepository.js').MenuMediaRepository} params.repository Repository instance.
   * @param {import('../../core/Logger.js').Logger} [params.logger] Logger implementation.
   */
  constructor({ repository, logger }) {
    /**
     * @private
     * @type {import('../repositories/MenuMediaRepository.js').MenuMediaRepository}
     */
    this.repository = repository;

    /**
     * @private
     * @type {import('../../core/Logger.js').Logger | undefined}
     */
    this.logger = logger;
  }

  /**
   * Retrieves stored menu media.
   * @returns {Promise<{ type: 'photo' | 'video', fileId: string, caption?: string, updatedAt?: string } | null>}
   */
  async getMenuMedia() {
    const media = await this.repository.get();
    if (!media || typeof media !== 'object') {
      return null;
    }

    if (!media.type || !media.fileId) {
      return null;
    }

    return media;
  }

  /**
   * Updates stored menu media.
   * @param {{ type: 'photo' | 'video', fileId: string, caption?: string, updatedBy?: number }} payload Media payload.
   * @returns {Promise<void>}
   */
  async updateMenuMedia(payload) {
    const media = {
      type: payload.type,
      fileId: payload.fileId,
      caption: payload.caption,
      updatedAt: new Date().toISOString(),
      updatedBy: payload.updatedBy
    };

    await this.repository.save(media);
  }

  /**
   * Sends menu media to the user if configured.
   * @param {import('grammy').Context} ctx Grammy context.
   * @returns {Promise<boolean>} True when media was sent.
   */
  async sendMenuMedia(ctx, options = {}) {
    try {
      const media = await this.getMenuMedia();

      if (!media) {
        return false;
      }

      const replyMarkup = options.replyMarkup ?? undefined;

      if (media.type === 'video') {
        await ctx.replyWithVideo(media.fileId, {
          caption: media.caption ?? undefined,
          reply_markup: replyMarkup
        });
      } else {
        await ctx.replyWithPhoto(media.fileId, {
          caption: media.caption ?? undefined,
          reply_markup: replyMarkup
        });
      }

      return true;
    } catch (error) {
      this.logger?.error('Failed to send menu media to user.', error);
      return false;
    }
  }
}
