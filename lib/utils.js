"use strict";
// UTILS
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeScore = exports.normalizeTag = exports.hasValue = exports.logError = exports.logWarn = exports.logInfo = exports.logDebug = void 0;
const logger = require("anyhow");
logger.setup();
/**
 * Helper to log debugging information (only when verbose is true).
 * @param options Program options.
 * @param message Message to be logged.
 */
function logDebug(options, message) {
    if (!options.console || !options.verbose)
        return;
    logger.debug(message);
}
exports.logDebug = logDebug;
/**
 * Helper to log important info.
 * @param options Program options.
 * @param message Message to be logged.
 */
function logInfo(options, message) {
    if (!options.console)
        return;
    logger.info(message);
}
exports.logInfo = logInfo;
/**
 * Helper to log warnings.
 * @param options Program options.
 * @param message Message to be logged.
 */
function logWarn(options, message) {
    if (!options.console)
        return;
    logger.warn(message);
}
exports.logWarn = logWarn;
/**
 * Helper to log errors according to the verbose option. If console logging
 * is disable on options, it will throw the passed error instead.
 * @param options Program options.
 * @param message Message to be logged.
 * @param ex Exception object to be logged.
 */
function logError(options, message, ex) {
    if (!options.console) {
        ex.message = `${message} | ${ex.message}`;
        throw ex;
    }
    if (options.verbose) {
        logger.error(message);
        logger.error(ex);
    }
    else {
        logger.error(message, ex.toString());
    }
}
exports.logError = logError;
/**
 * Helper to check if the passed value has an actual value.
 * @param value The value to be checked.
 */
function hasValue(value) {
    return value !== null && typeof value != "undefined";
}
exports.hasValue = hasValue;
/**
 * Helper to get a normalized tag name.
 * @param value Label or description.
 */
function normalizeTag(value) {
    const tag = value.toLowerCase().trim().replace("!", "");
    return tag.replace(/  /g, " ").replace(/ /g, "-");
}
exports.normalizeTag = normalizeTag;
/**
 * Helper to get a score with 3 decimal places.
 * @param value Score to be normalized.
 */
function normalizeScore(value) {
    if (value < 0.001)
        return null;
    else
        return Math.round(value * 1000) / 1000;
}
exports.normalizeScore = normalizeScore;
