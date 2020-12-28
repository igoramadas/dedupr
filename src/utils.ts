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
 * Helper to log errors according to the verbose option.
 * @param options Program options.
 * @param message Message to be logged.
 * @param ex Exception object to be logged.
 */
export function logError(options: Options, message: string, ex: Error) {
    if (!options.console) return

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
