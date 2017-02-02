#!/usr/bin/env node#

# Required dependencies.
async = require "async"
crypto = require "crypto"
fs = require "fs"
path = require "path"

# Global variables.
fileHashes = {}
duplicates = []
folders = []
folderTasks = []

# Create file processor queue.
queueProcessor = (filepath, callback) -> scanFile filepath, callback
fileQueue = async.queue queueProcessor, 8
fileQueue.drain = -> finished()

# Default options, will list duplicates only, recursively.
options = {
    verbose: false
    removeDuplicates: false
    fast: false
    superfast: false
    output: false
}

# Set start time.
startTime = Date.now()

# Show help on command line (dedup.js --help).
showHelp = ->
    console.log "dedup.js <options> <folders>"
    console.log "  -v,  --verbose        log things as they happen"
    console.log "  -d,  --delete         delete duplicates when found (use with care!!!)"
    console.log "  -f,  --fast           hash first 2MB only for better performance (unsafe)"
    console.log "  -s,  --superfast      hash first 20KB only for max performance (unsafer!)"
    console.log "  -o,  --output         save list of duplicate files to dedup.log"
    console.log "  -h,  --help           help me!"

# Get parameters from command line.
getParams = ->
    params = Array::slice.call process.argv, 2

    for p in params
        switch p
            when "-v", "--verbose"
                options.verbose = true
            when "-d", "--delete"
                options.removeDuplicates = true
            when "-f", "--fast"
                options.fast = true
            when "-s", "--superfast"
                options.superfast = true
            when "-o", "--output"
                options.output = true
            when "-h", "--help"
                showHelp()
                process.exit 0
            else
                folders.push p

    # Exit if no folders were passed.
    if folders.length < 1
        console.log "No folders were passed. Abort!"
        process.exit 0

# Proccess file and gets its hash.
getFileHash = (filepath, maxBytes, callback) ->
    hash = crypto.createHash "md5"
    readStream = fs.createReadStream filepath
    bytesRead = 0

    # Helper to close the read stream.
    finish = ->
        result = null

        try
            readStream.close()
            result = hash.digest "hex"
        catch ex
            console.error "Error closing stream for #{filepath}: #{ex}"

        callback result

    # Something went wrong?
    reject = (err) ->
        console.log "Error getting MD5 hash for #{filepath}: #{err}"

        try
            readStream.close()
        catch ex
            console.error "Error closing stream for #{filepath}: #{ex}"

        callback null

    # Append file data to the hash.
    readStream.on "data", (data) ->
        if maxBytes and (bytesRead + data.length) > maxBytes
            hash.update data.slice 0, maxBytes - bytesRead
            finish()
        else
            bytesRead += data.length
            hash.update data

    readStream.on "end", finish
    readStream.on "error", reject

# Save file hash and path to the fileHashes collection.
saveHash = (hash, filepath) ->
    dup = filepath
    existing = fileHashes[hash] || []
    existing.push filepath

    fileHashes[hash] = existing

    # File already exists?
    if existing.length < 2
        if options.verbose
            console.log "File scanned: #{filepath} - #{hash}"
    else
        if options.verbose
            console.log "Duplicate found: #{filepath} - #{hash}"

        # Delete duplicates?
        if options.removeDuplicates
            fs.unlink filepath, (err) ->
                if err?
                    dup += " | error"
                    console.log "Could not delete #{filepath}: #{err}"
                else
                    dup += " | deleted"
                    console.log "Deleted #{filepath}" if options.verbose

        duplicates.push dup

# Verify and get hash for the specified file.
scanFile = (filepath, callback) ->
    if options.fast
        readBufferSize = 2000000
    else if options.superfast
        readBufferSize = 20000
    else
        readBufferSize = false

    # Get MD5 hash from file.
    getFileHash filepath, readBufferSize, (hash) ->
        saveHash hash, filepath
        callback()

# Scan a folder to match duplicates.
scanFolder = (folder, callback) ->
    if options.verbose
        console.log "Scanning #{folder} ..."

    # Helper to scan folder contents (directories and files).
    scanner = (file) ->
        filepath = path.join folder, file

        try
            stats = fs.statSync filepath

            if stats.isDirectory()
                scanFolder filepath
            else
                fileQueue.push filepath
        catch ex
            console.error "Error reading #{filepath}: #{ex}"

    try
        contents = fs.readdirSync folder

        if options.verbose
            console.log "#{folder} has #{contents.length} itens"

        scanner c for c in contents
        callback null if callback?
    catch ex
        console.error "Error reading #{folder}: #{ex}"
        callback ex if callback?

# Finished!
finished = (err, result) ->
    duration = (Date.now() - startTime) / 1000

    console.log ""
    console.log "Finished after #{duration} seconds!"
    console.log "#{Object.keys(fileHashes).length} unique files"
    console.log "#{duplicates.length} duplicates"

    # Save output to dedup.log?
    if options.output
        if options.removeDuplicates
            logContents = "Duplicate files found (and deleted):\n\n"
        else
            logContents = "Duplicate files found:\n\n"

        logContents += duplicates.join "\n"

        fs.writeFileSync "dedup.log", logContents, "utf8"

        if options.verbose
            console.log "Saved output to dedup.log"

    # Bye!
    console.log ""

# Run it!
run = ->
    console.log ""
    console.log "########################################################"
    console.log "###                   - Dedup.js -                   ###"
    console.log "########################################################"
    console.log ""

    # First we get the parameters. If --help, it will end here.
    getParams()

    console.log "Will search for duplicates on #{folders.length} locations."
    console.log ""

    if options.verbose
        console.log "Start time: #{startTime}"
        console.log "Options: #{JSON.stringify(options, null, 0)}"

    # Iterate and scan search folders.
    for folder in folders
        folderTasks.push (callback) -> scanFolder folder, callback

    # Run run run!
    async.parallelLimit folderTasks, 2

# Program called, starts here!
# -----------------------------------------------------------------------------
run()
