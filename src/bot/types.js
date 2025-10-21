/**
 * @typedef {'add' | 'delete'} AdminFlowMode
 */

/**
 * @typedef {'awaiting_title' | 'awaiting_document' | 'awaiting_confirmation' | 'awaiting_id'} AdminFlowStep
 */

/**
 * @typedef {Object} AdminFlowState
 * @property {number} initiatorId Identifier of the admin who started the flow.
 * @property {AdminFlowMode} mode Current admin flow mode.
 * @property {AdminFlowStep} step Current step inside the flow.
 * @property {{ title?: string, fileId?: string, guideId?: string, guideTitle?: string }} payload Data collected during the flow.
 */

/**
 * @typedef {Object} MenuMediaFlowState
 * @property {number} initiatorId Identifier of the admin who initiated the media update.
 * @property {boolean} awaitingMedia Whether the flow is waiting for media input.
 */

/**
 * @typedef {Object} SubscriptionAuditState
 * @property {number} initiatorId Identifier of the admin who requested the check.
 * @property {string} requestedAt ISO timestamp when the check was initiated.
 */

/**
 * @typedef {Object} BotSession
 * @property {AdminFlowState | null} adminFlow Admin flow state associated with the user.
 * @property {MenuMediaFlowState | null} menuMediaFlow Menu media configuration flow.
 * @property {SubscriptionAuditState | null} subscriptionAudit Pending channel subscription audit.
 */

// Export marker to keep file as an ES module.
export const botTypes = {};
