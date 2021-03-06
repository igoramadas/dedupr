// TYPES

/**
 * Program options.
 */
interface Options {
    /** List of folders to be scanned. */
    folders?: string[]
    /** Valid file extensions. Default is all. */
    extensions?: string[]
    /** Full path to the output log file, default is dedupr.log. */
    output?: string
    /** How many files should be hashed in parallel? Default is 5. */
    parallel?: number
    /** Activate extra logging. */
    verbose?: boolean
    /** Log output to the console? When calling via command line this is true by default. */
    console?: boolean
    /** Hashing algorithm to be used, defaut is SHA256. */
    hashAlgorithm?: string
    /** Initial content of files that should be hashed. Default is 20000 (20MB). */
    hashSize?: number
    /** Reverse the folders order? Default is false, so first file found is considered the original. */
    reverse?: boolean
    /** Also consider filenames when checking if a file is a duplicate. */
    filename?: boolean
    /** Delete duplicate files. */
    delete?: boolean
}

/**
 * Image tags and details taken from the scanning results.
 */
interface FileResult {
    /** Full path to the original file. */
    file: string
    /** File size in bytes. */
    size: number
    /** Computed file hash. */
    hash?: string
    /** Path to the duplicate files. */
    duplicates?: string[]
    /** Any errors during the file scanning? */
    error?: any
}

/**
 * File which should have its hash computed.
 */
interface FileToHash {
    /** Full path to the file. */
    file: string
    /** File size in bytes. */
    size: number
}
