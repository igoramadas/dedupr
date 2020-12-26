// DEDUPR

import {logDebug, logError, logInfo, hasValue} from "./utils"
import crypto = require("crypto")
import fs = require("fs")
import logger = require("anyhow")
import path = require("path")

// Current executing folder.
const currentFolder = process.cwd() + "/"

// Default options.
const defaultOptions: Options = {
    parallel: 5,
    output: "dedupr.json",
    hashSize: 100000,
    hashAlgorithm: "sha256"
}

/**
 * Dedupr main module.
 */
export class Dedupr {
    constructor(options: Options) {
        this.options = options

        // Enforce default options.
        if (!this.options.extensions || this.options.extensions.length < 0 || this.options.extensions.indexOf("*") >= 0) {
            this.options.extensions = null
        } else {
            this.options.extensions = this.options.extensions.map((e) => e.toLowerCase())
        }
        if (!this.options.output) {
            this.options.output = defaultOptions.output
        }
        if (!this.options.hashSize || this.options.hashSize < 0) {
            this.options.hashSize = defaultOptions.hashSize
        }
        if (!this.options.hashAlgorithm) {
            this.options.hashAlgorithm = defaultOptions.hashAlgorithm
        } else {
            this.options.hashAlgorithm = this.options.hashAlgorithm.toLocaleLowerCase()
        }

        // Make sure the logger is set.
        if (this.options.verbose) {
            logger.levels.push("debug")
        }
    }

    /**
     * Program options.
     */
    options: Options

    /**
     * Results of original files, hashes and their duplicates.
     */
    results: {[id: string]: FileResult}

    /**
     * If running, when did the process start.
     */
    startTime: Date

    /**
     * Start scanning the passed folders.
     */
    run = async (): Promise<void> => {
        logInfo(defaultOptions, "##########")
        logInfo(defaultOptions, "# Dedupr #")
        logInfo(defaultOptions, "##########")

        if (!this.options.folders || this.options.folders.length < 1) {
            throw new Error("No folders were passed")
        }

        // Log options.
        const arr = Object.entries(this.options).map((opt) => (hasValue(opt[1]) ? `${opt[0]}: ${opt[1]}` : null))
        const logOptions = arr.filter((opt) => opt !== null)
        logDebug(this.options, `Options: ${logOptions.join(" | ")}`)

        // Reset state.
        this.results = {}
        this.startTime = new Date()

        // Make sure folders are absolute paths.
        for (let i = 0; i < this.options.folders.length; i++) {
            const folder = this.options.folders[i]

            if (!path.isAbsolute(folder)) {
                this.options.folders[i] = currentFolder + folder
            }
        }

        // Subfolders option is only allowed for a single folder.
        if (this.options.subFolders) {
            if (this.options.folders.length > 1) {
                throw new Error(`Using the "subFolders" option is only allowed if you pass a single folder`)
            }

            const mainFolder = this.options.folders[0]
            let folders = fs.readdirSync(mainFolder)

            folders = folders.map((f) => path.join(mainFolder, f))
            folders = folders.filter((f) => fs.statSync(f).isDirectory())

            // Sort according to the reverse option.
            folders.sort()
            if (this.options.reverse) {
                folders.reverse()
            }

            this.options.folders = folders
        }

        // Scan folders and then process all files.
        try {
            for (let folder of this.options.folders) {
                await this.scanFolder(folder)
            }

            this.end()
        } catch (ex) {
            logError(this.options, `Failure processing files`, ex)
        }
    }

    /**
     * When the scanning has finished, delete duplicates (if set on options) and save to the output.
     */
    end = (): void => {
        try {
            const duration = (Date.now() - this.startTime.valueOf()) / 1000
            const results = Object.values(this.results)
            logDebug(this.options, `Found ${results.length} distinct files in total`)

            // Filter only file that had duplicates.
            const duplicates = results.filter((r) => r.duplicates.length > 0)
            logInfo(this.options, `Found ${duplicates.length} files with duplicates in ${duration} seconds`)

            // Save results to a file?
            if (this.options.output) {
                fs.writeFileSync(this.options.output, JSON.stringify(duplicates, null, 2), "utf8")
                logInfo(this.options, `Saved output to ${this.options.output}`)
            }

            logInfo(this.options, "")
        } catch (ex) {
            logError(this.options, `Failure ending the program`, ex)
        }
    }

    /**
     * Scan the specified folder and get its file list.
     * @param folder Folder to be scanned.
     */
    scanFolder = async (folder: string): Promise<void> => {
        const arrFiles = []
        const arrFolders = []

        // Process files in alphabetical order by default, descending if "reverse" option is set.
        try {
            const contents = fs.readdirSync(folder)
            logDebug(this.options, `Folder ${folder} has ${contents.length} objects`)

            // Sort folder contents alphabetically.
            contents.sort()

            // Reverse sorting?
            if (this.options.reverse) {
                contents.reverse()
            }

            // Iterate and parse files first.
            for (let filepath of contents) {
                try {
                    const stats = fs.statSync(filepath)

                    if (stats.isDirectory()) {
                        arrFolders.push(filepath)
                    } else {
                        const ext = path.extname(filepath).toLowerCase().replace(".", "")

                        if (!this.options.extensions || this.options.extensions.indexOf(ext) >= 0) {
                            arrFiles.push(filepath)
                        } else {
                            logDebug(this.options, `File ${filepath} does not have a valid extension, skip`)
                        }
                    }
                } catch (innerEx) {
                    logError(this.options, `Error parsing ${filepath}`, innerEx)
                }
            }
        } catch (ex) {
            logError(this.options, `Error reading ${folder}`, ex)
        }

        // First process the files in chunks (according to the parallel limit).
        for (let i = 0, j = arrFiles.length; i < j; i += this.options.parallel) {
            const chunk = arrFiles.slice(i, i + this.options.parallel)
            await Promise.all(chunk.map(async (filepath: string) => await this.scanFile(filepath)))
        }

        // Then process subdirectories.
        for (let folder of arrFolders) {
            await this.scanFolder(folder)
        }
    }

    /**
     * Scan and generate a hash for the specified file.
     * @param filepath Full file path.
     */
    scanFile = async (filepath: string): Promise<void> => {
        return new Promise((resolve) => {
            const hash = crypto.createHash(this.options.hashAlgorithm)
            const readStream = fs.createReadStream(filepath)
            const maxBytes = this.options.hashSize
            let failed = false
            let bytesRead = 0

            // Finished reading file, close the stream and get hash digest.
            const finish = () => {
                try {
                    readStream.close()
                } catch (ex) {
                    logError(this.options, `Error closing hash stream for ${filepath}`, ex)
                }

                // Only add to the results if it didn't fail.
                if (!failed) {
                    this.processFile(filepath, hash.digest("hex"))
                } else {
                    logDebug(this.options, `File ${filepath} not added to results due to hash failure`)
                }

                resolve()
            }

            // Something went wrong? Log error and close the stream.
            const fail = (err) => {
                failed = true
                logError(this.options, `Error getting hash for ${filepath}`, err)
                finish()
            }

            // Append file data to the hash.
            readStream.on("data", function (data) {
                if (maxBytes && bytesRead + data.length > maxBytes) {
                    hash.update(data.slice(0, maxBytes - bytesRead))
                    return finish()
                }

                bytesRead += data.length
                hash.update(data)
            })

            readStream.on("end", finish)
            readStream.on("error", fail)
        })
    }

    /**
     * Save the hash value for the specified file.
     * @param filepath Full file path.
     * @param hash Computed hash value.
     */
    processFile = (filepath: string, hash: string): void => {
        const id = this.options.filename ? `${hash}-${path.basename(filepath)}` : hash
        let isDuplicate = false

        if (this.results[id]) {
            isDuplicate = true
            this.results[id].duplicates.push(filepath)
        } else {
            this.results[id] = {
                file: filepath,
                hash: hash,
                duplicates: []
            }
        }

        // Not a duplicate? Stop here.
        if (!isDuplicate) {
            return logDebug(this.options, `File processed: ${filepath} - ${hash}`)
        }

        // Delete duplicates?
        if (this.options.delete) {
            try {
                fs.unlinkSync(filepath)
                logInfo(this.options, `Duplicate deleted: ${filepath} - ${hash}`)
            } catch (ex) {
                logError(this.options, `Could not delete ${filepath}`, ex)
            }
        } else {
            logInfo(this.options, `Duplicate found: ${filepath} - ${hash}`)
        }
    }
}

export default Dedupr
