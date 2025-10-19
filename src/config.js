import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

loadEnv();

const parseAdminIds = () => {
  const raw = process.env.ADMIN_USER_IDS ?? '';
  return raw
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
};

const defaultGuidesFile =
  process.env.GUIDES_DATA_PATH && process.env.GUIDES_DATA_PATH.trim().length > 0
    ? resolve(process.cwd(), process.env.GUIDES_DATA_PATH)
    : resolve(process.cwd(), 'data', 'guides.json');

/**
 * Guide descriptor shape.
 * @typedef {Object} GuideDescriptor
 * @property {string} id Unique identifier.
 * @property {string} title Guide human-readable title.
 * @property {string} fileId Telegram file identifier.
 */

/**
 * Text resources used across the bot.
 * @typedef {Object} MessageCatalog
 * @property {string} noGuides Fallback message when no guides are available.
 * @property {string} adminOnly Notice for non-admin users attempting admin commands.
 * @property {string} guideAdded Confirmation text for successfully added guides.
 * @property {string} guideDeleted Confirmation text for successfully deleted guides.
 * @property {string} nothingToConfirm Message when there is no pending admin action to confirm.
 * @property {string} flowCancelled Message when admin flow is cancelled.
 */

/**
 * Application-level configuration loaded from environment variables.
 * @typedef {Object} AppConfig
 * @property {string} botToken Telegram bot token.
 * @property {Object} polling Telegram polling configuration.
 * @property {string[]} polling.allowedUpdates Allowed update types for long polling.
 * @property {GuideDescriptor[]} guides Static guide descriptors used for initial seeding.
 * @property {number[]} admins List of Telegram user identifiers with admin privileges.
 * @property {{ guidesFile: string }} storage Storage locations used by the app.
 * @property {MessageCatalog} messages Text resources shared throughout the bot.
 * @property {{
 *   channelUsername: string,
 *   channelLink: string,
 *   promptMessage: string,
 *   buttonText: string,
 *   reminderMessage: string
 * }} subscription Subscription enforcement settings.
 */

/**
 * @type {AppConfig}
 */
export const config = {
  botToken: process.env.BOT_TOKEN ?? '',
  polling: {
    allowedUpdates: []
  },
  guides: [
    {
      id: 'choose-developer',
      title: 'Как выбрать застройщика?',
      fileId: process.env.GUIDE_DEVELOPER_FILE_ID ?? ''
    },
    {
      id: 'choose-land-plot',
      title: 'Как выбрать земельный участок?',
      fileId: process.env.GUIDE_LAND_PLOT_FILE_ID ?? ''
    }
  ],
  admins: parseAdminIds(),
  storage: {
    guidesFile: defaultGuidesFile
  },
  subscription: {
    channelUsername: process.env.SUBSCRIPTION_CHANNEL_USERNAME?.trim() || '@zagorodomekb',
    channelLink: process.env.SUBSCRIPTION_CHANNEL_LINK?.trim() || 'https://t.me/zagorodomekb',
    promptMessage:
      'Прежде чем получить гайд, подпишитесь на наш канал <a href="https://t.me/zagorodomekb">Загородная Недвижимость Урала</a>.',
    buttonText: 'Проверить подписку',
    reminderMessage:
      'Мы очень ценим ваш интерес к нашим материалам! Подпишитесь, пожалуйста, на канал <a href="https://t.me/zagorodomekb">Загородная Недвижимость Урала</a>, чтобы открыть доступ к гайдам ❤️'
  },
  messages: {
    noGuides:
      'Пока гайдов нет, но дух стройки жив! Уже завозим контент, ставим леса и натягиваем сетку полезных советов',
    adminOnly: 'Команда доступна только администраторам.',
    guideAdded: 'Гайд добавлен.',
    guideDeleted: 'Гайд удалён.',
    nothingToConfirm: 'Нет действий, требующих подтверждения.',
    flowCancelled: 'Действие отменено.'
  }
};

if (!config.botToken) {
  throw new Error('Environment variable BOT_TOKEN is required.');
}
