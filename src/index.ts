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
            this.options.extensions = this.options.extensions.map((e) => e.toLowerCase().replace(".", ""))
        }
        if (!this.options.output) {
            this.options.output = defaultOptions.output
        }
        if (!this.options.parallel) {
            this.options.parallel = defaultOptions.parallel
        }
        if (!this.options.hashSize) {
            this.options.hashSize = defaultOptions.hashSize
        }
        if (!this.options.hashAlgorithm) {
            this.options.hashAlgorithm = defaultOptions.hashAlgorithm
        } else {
            this.options.hashAlgorithm = this.options.hashAlgorithm.toLocaleLowerCase()
        }

        // Do not save output?
        if (this.options.output == "false"){
            this.options.output = null
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
     * Start scanning the passed folders.
     */
    run = async (): Promise<void> => {
        const startTime = new Date().valueOf()

        // Header.
        logInfo(this.options, "##########")
        logInfo(this.options, "# Dedupr #")
        logInfo(this.options, "##########")
        logInfo(this.options, "")

        // Log options.
        const arr = Object.entries(this.options).map((opt) => (hasValue(opt[1]) ? `${opt[0]}: ${opt[1]}` : null))
        const logOptions = arr.filter((opt) => opt !== null)
        logDebug(this.options, `Options: ${logOptions.join(" | ")}`)

        // Basic command validation.
        if (!this.options.folders || this.options.folders.length < 1) {
            throw new Error("No folders were passed")
        }
        if (!this.options.parallel || this.options.parallel < 1) {
            throw new Error("The parallel option must be at least 1")
        }
        if (!this.options.hashSize || this.options.hashSize < 1) {
            throw new Error("The hashSize option must be at least 1")
        }

        // Check if passed hash algorithm is available.
        const availableHashes = crypto.getHashes()
        if (availableHashes.indexOf(this.options.hashAlgorithm) < 0) {
            throw new Error(`Hash algorithm ${this.options.hashAlgorithm} not supported`)
        }

        // Reset state.
        this.results = {}

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

            // Finish it!
            const duration = ((Date.now().valueOf() - startTime) / 1000).toFixed(3)
            logInfo(this.options, `Finished in ${duration} seconds`)
            logInfo(this.options, "")
        } catch (ex) {
            logError(this.options, `Failure`, ex)
        }
    }

    /**
     * Save the output when scanning has finished.
     */
    end = (): void => {
        try {
            const results = Object.values(this.results)

            // Filter only file that had duplicates.
            const duplicates = results.filter((r) => r.duplicates.length > 0)
            const count = duplicates.map((d) => d.duplicates.length).reduce((a, b) => a + b, 0)

            logInfo(this.options, `Found ${results.length} distinct files and ${count} duplicates`)

            // Save results to a file?
            if (this.options.output) {
                let targetFile = this.options.output
                if (!path.isAbsolute(targetFile)) {
                    targetFile = path.join(currentFolder, targetFile)
                }

                fs.writeFileSync(targetFile, JSON.stringify(duplicates, null, 2), "utf8")
                logInfo(this.options, `Saved output to ${targetFile}`)
            }
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

        // Stop right here if folder does not exist.
        if (!fs.existsSync(folder)) {
            throw new Error(`Folder ${folder} does not exist`)
        }

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
                            logDebug(this.options, `File ${filepath} does not have a valid extension`)
                        }
                    }
                } catch (innerEx) {
                    logError(this.options, `Error parsing: ${filepath}`, innerEx)
                }
            }
        } catch (ex) {
            logError(this.options, `Error reading: ${folder}`, ex)
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

            // If file is small enough, hash it all at once.
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

            // Close file and check duplicates.
            await fd.close()
            this.processFile(fileToHash, hash.digest("hex"))
        } catch (ex) {
            logError(this.options, `Error reading: ${fileToHash.file}`, ex)
            this.processFile(fileToHash, null, ex.message || ex.toString())
        }
    }

    /**
     * Save the hash value for the specified file.
     * @param fileToHash File path and size.
     * @param hash Computed hash value.
     */
    processFile = (fileToHash: FileToHash, hash: string, error?: string): void => {
        let isDuplicate = false

        // Error getting the file hash? Add error details and stop here.
        if (error) {
            this.results[fileToHash.file] = {
                file: fileToHash.file,
                size: fileToHash.size,
                error: error
            }

            return
        }

        // Get the unique ID based on file size, hash and (optioal) filename.
        let id = `${hash}-${fileToHash.size}`
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
                logError(this.options, `Could not delete: ${fileToHash.file}`, ex)
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
