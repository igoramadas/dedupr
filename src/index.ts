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
    output: "dedupr.json",
    parallel: 5,
    hashSize: 2048,
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
        if (!this.options.parallel || this.options.parallel < 0) {
            this.options.parallel = defaultOptions.parallel
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
        logInfo(this.options, "##########")
        logInfo(this.options, "# Dedupr #")
        logInfo(this.options, "##########")

        // Log options.
        const arr = Object.entries(this.options).map((opt) => (hasValue(opt[1]) ? `${opt[0]}: ${opt[1]}` : null))
        const logOptions = arr.filter((opt) => opt !== null)
        logDebug(this.options, `Options: ${logOptions.join(" | ")}`)

        // At least one folder must be passed.
        if (!this.options.folders || this.options.folders.length < 1) {
            throw new Error("No folders were passed")
        }

        // Check if passed hash algorithm is available.
        const availableHashes = crypto.getHashes()
        if (availableHashes.indexOf(this.options.hashAlgorithm) < 0) {
            throw new Error(`Hash algorithm ${this.options.hashAlgorithm} not supported`)
        }

        // Reset state.
        this.results = {}
        this.startTime = new Date()

        // Make sure folders are absolute paths.
        for (let i = 0; i < this.options.folders.length; i++) {
            const folder = this.options.folders[i]

            if (!path.isAbsolute(folder)) {
                this.options.folders[i] = path.join(currentFolder, folder)
            }
        }

        // Reverse folder order if option was passed.
        if (this.options.reverse) {
            this.options.folders.reverse()
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

            // Filter only file that had duplicates.
            const duplicates = results.filter((r) => r.duplicates.length > 0)
            const count = duplicates.map((d) => d.duplicates.length).reduce((a, b) => a + b, 0)

            logInfo(this.options, `Found ${results.length} distinct files, ${count} duplicates in ${duration} seconds`)

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
        const arrFiles: FileToHash[] = []
        const arrFolders: string[] = []

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

            // Iterate and parse files first, then folders.
            for (let filepath of contents) {
                try {
                    filepath = path.join(folder, filepath)
                    const stats = fs.statSync(filepath)

                    if (stats.isDirectory()) {
                        arrFolders.push(filepath)
                    } else {
                        const ext = path.extname(filepath).toLowerCase().replace(".", "")

                        if (!this.options.extensions || this.options.extensions.indexOf(ext) >= 0) {
                            arrFiles.push({file: filepath, size: stats.size})
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
        if (arrFiles.length > 0) {
            for (let i = 0, j = arrFiles.length; i < j; i += this.options.parallel) {
                const chunk = arrFiles.slice(i, i + this.options.parallel)
                await Promise.all(chunk.map(async (f: FileToHash) => await this.scanFile(f)))
            }
        }

        // Then process subdirectories.
        for (let folder of arrFolders) {
            await this.scanFolder(folder)
        }
    }

    /**
     * Scan and generate a hash for the specified file.
     * @param fileToHash File path and size.
     */
    scanFile = async (fileToHash: FileToHash): Promise<void> => {
        try {
            const hash = crypto.createHash(this.options.hashAlgorithm)
            let hasEnd = true
            let size = this.options.hashSize * 1024

            // If file is too small, hash it all at once.
            if (fileToHash.size < size * 2) {
                hasEnd = false
                size = fileToHash.size
            }

            const fd = await fs.promises.open(fileToHash.file, "r")

            // Read first part of the file.
            const fStart = await fd.read(Buffer.alloc(size), 0, size, 0)
            hash.update(fStart.buffer)

            // If file is bigger than the specified hash size, read the last portion.
            if (hasEnd) {
                const pos = fileToHash.size - this.options.hashSize * 1024
                const fEnd = await fd.read(Buffer.alloc(size), 0, size, pos)
                hash.update(fEnd.buffer)
            }

            await fd.close()

            // Check duplicates.
            this.processFile(fileToHash, hash.digest("hex"))
        } catch (ex) {
            logError(this.options, `Error reading ${fileToHash.file}`, ex)
        }
    }

    /**
     * Save the hash value for the specified file.
     * @param fileToHash File path and size.
     * @param hash Computed hash value.
     */
    processFile = (fileToHash: FileToHash, hash: string): void => {
        let isDuplicate = false
        let id = `${hash}-${fileToHash.size}`

        // Check for filename as well to match duplicates?
        if (this.options.filename) {
            id += `-${path.basename(fileToHash.file)}`
        }

        // File already found? Mark as duplicate, otherwise create a new record on the results.
        if (this.results[id]) {
            isDuplicate = true
            this.results[id].duplicates.push(fileToHash.file)
        } else {
            this.results[id] = {
                file: fileToHash.file,
                size: fileToHash.size,
                hash: hash,
                duplicates: []
            }
        }

        // Not a duplicate? Stop here.
        if (!isDuplicate) {
            return logDebug(this.options, `File processed: ${fileToHash.file} - ${hash}`)
        }

        // Delete duplicates?
        if (this.options.delete) {
            try {
                fs.unlinkSync(fileToHash.file)
                logInfo(this.options, `Duplicate deleted: ${fileToHash.file} - ${hash}`)
            } catch (ex) {
                logError(this.options, `Could not delete ${fileToHash.file}`, ex)
            }
        } else {
            if (this.results[id].duplicates.length == 1) {
                logInfo(this.options, `File has duplicate(s): ${this.results[id].file} - ${hash}`)
            }

            logDebug(this.options, `Duplicate found: ${fileToHash.file} - ${hash}`)
        }
    }
}

export default Dedupr
