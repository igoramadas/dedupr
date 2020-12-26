// UTILS

import logger = require("anyhow")
logger.setup()

/**
 * Helper to log debugging information (only when verbose is true).
 * @param options Program options.
 * @param message Message to be logged.
 */
export function logDebug(options: Options, message: string) {
    if (!options.console || !options.verbose) return

    logger.debug(message)
}

/**
 * Helper to log important info.
 * @param options Program options.
 * @param message Message to be logged.
 */
export function logInfo(options: Options, message: string) {
    if (!options.console) return

    logger.info(message)
}

/**
 * Helper to log warnings.
 * @param options Program options.
 * @param message Message to be logged.
 */
export function logWarn(options: Options, message: string) {
    if (!options.console) return

    logger.warn(message)
}

/**
 * Helper to log errors according to the verbose option. If console logging
 * is disable on options, it will throw the passed error instead.
 * @param options Program options.
 * @param message Message to be logged.
 * @param ex Exception object to be logged.
 */
export function logError(options: Options, message: string, ex: Error) {
    if (!options.console) {
        ex.message = `${message} | ${ex.message}`
        throw ex
    }

    if (options.verbose) {
        logger.error(message)
        logger.error(ex)
    } else {
        logger.error(message, ex.toString())
    }
}

/**
 * Helper to check if the passed value has an actual value.
 * @param value The value to be checked.
 */
export function hasValue(value: any): boolean {
    return value !== null && typeof value != "undefined"
}

/**
 * Helper to get a normalized tag name.
 * @param value Label or description.
 */
export function normalizeTag(value: string): string {
    const tag = value.toLowerCase().trim().replace("!", "")
    return tag.replace(/  /g, " ").replace(/ /g, "-")
}

/**
 * Helper to get a score with 3 decimal places.
 * @param value Score to be normalized.
 */
export function normalizeScore(value: number): number {
    if (value < 0.001) return null
    else return Math.round(value * 1000) / 1000
}
