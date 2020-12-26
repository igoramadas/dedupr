/**
 * Helper to log debugging information (only when verbose is true).
 * @param options Program options.
 * @param message Message to be logged.
 */
export declare function logDebug(options: Options, message: string): void;
/**
 * Helper to log important info.
 * @param options Program options.
 * @param message Message to be logged.
 */
export declare function logInfo(options: Options, message: string): void;
/**
 * Helper to log warnings.
 * @param options Program options.
 * @param message Message to be logged.
 */
export declare function logWarn(options: Options, message: string): void;
/**
 * Helper to log errors according to the verbose option. If console logging
 * is disable on options, it will throw the passed error instead.
 * @param options Program options.
 * @param message Message to be logged.
 * @param ex Exception object to be logged.
 */
export declare function logError(options: Options, message: string, ex: Error): void;
/**
 * Helper to check if the passed value has an actual value.
 * @param value The value to be checked.
 */
export declare function hasValue(value: any): boolean;
/**
 * Helper to get a normalized tag name.
 * @param value Label or description.
 */
export declare function normalizeTag(value: string): string;
/**
 * Helper to get a score with 3 decimal places.
 * @param value Score to be normalized.
 */
export declare function normalizeScore(value: number): number;
