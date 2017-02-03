#!/usr/bin/env node

# Required dependencies.
async = require "async"
cryptoAsync = require "crypto-async"
fs = require "fs"
path = require "path"

# Collection of file hashes (with or without filenames, depending on --filename option).
fileHashes = {}

# List of duplicates.
duplicates = []

# List of folders to be scanned.
folders = []

# Create file processor queue (scan the file and get its hash based on options).
queueProcessor = (filepath, callback) -> scanFile filepath, callback
fileQueue = async.queue queueProcessor, 4

# File processor queue will drain once we have processed all files.
fileQueue.drain = -> finished()

# Default options, will list duplicates only, using SHA1.
options = {
    verbose: false
    removeDuplicates: false
    fast: false
    superfast: false
    crazyfast: false
    filename: false
    output: false
    algorithm: "SHA1"
}

# Set start time (Unix timestamp).
startTime = Date.now()

# Show help on command line (dedup.js --help).
showHelp = ->
    console.log ""
    console.log "dedup.js <options> <folders>"
    console.log ""
    console.log "  -v,    --verbose     log things as they happen"
    console.log "  -d,    --delete      delete duplicates when found (use with care!!!)"
    console.log "  -f,    --fast        hash first 5MB only for better performance (unsafe-ish)"
    console.log "  -sf,   --superfast   hash first 500KB only for max performance (unsafer)"
    console.log "  -cf,   --crazyfast   hash first 10KB only for max performance (very unsafe)"
    console.log "  -fn,   --filename    only consider duplicate files with same filename"
    console.log "  -md5,  --md5         MD5 instead of SHA1 (usually faster, might have collisions)"
    console.log "  -o,    --output      save list of duplicate files to dedup.log"
    console.log "  -h,    --help        help me!"
    console.log ""
    console.log "Please note that priority runs top to bottom. So superfast has preference"
    console.log "over fast, and sha1 has preference over md5, for example."
    console.log ""
    console.log "Examples:"
    console.log ""
    console.log "Get duplicates on home folder, check first 500KB only, match filenames"
    console.log "  $ dedup.js -sf -fn /home/user"
    console.log ""
    console.log "Delete duplicates on database folder, using md5"
    console.log "  $ dedup.js -d -md5 /database"
    console.log ""
    console.log "Here we pass fast, crazyfast and superfast - crazyfast has preference"
    console.log "  $ dedup.js -f -cf -sf /somefolder"
    console.log ""

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
            when "-sf", "--superfast"
                options.superfast = true
            when "-cf", "--crazyfast"
                options.crazyfast = true
            when "-fn", "--filename"
                options.filename = true
            when "-md5", "--md5"
                options.algorithm = "MD5"
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

# Proccess file and generate its MD5 hash.
getFileHash = (filepath, maxBytes, callback) ->
    filedata = []
    readStream = fs.createReadStream filepath
    bytesRead = 0

    # Helper to close the read stream.
    finish = ->
        try
            readStream.close()

            buf = Buffer.concat filedata
            hash = cryptoAsync.hash options.algorithm, buf, (err, hash) ->
                if err?
                    console.error "Error generating hash for #{filepath}: #{err}"
                    callback null
                else
                    hex = hash.toString "hex"
                    callback hex
        catch ex
            console.error "Error preparing hash for #{filepath}: #{ex}"
            callback null

    # Something went wrong? Close stream and return with empty callback.
    reject = (err) ->
        console.log "Error getting MD5 hash for #{filepath}: #{err}"

        try
            readStream.close()
        catch ex
            console.error "Error closing stream for #{filepath}: #{ex}"

        callback null

    # Append file data to the hash.
    readStream.on "data", (data) ->
        filedata.push data

        if maxBytes and (bytesRead + data.length) > maxBytes
            finish()
        else
            bytesRead += data.length

    readStream.on "end", finish
    readStream.on "error", reject

# Check duplicates based on the fileHashes collection.
saveHash = (hash, filepath) ->
    if options.filename
        id = "#{hash}-#{path.basename(filepath)}"
    else
        id = hash

    dup = filepath
    existing = fileHashes[id] || []
    existing.push filepath

    fileHashes[id] = existing

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
    if options.crazyfast
        readBufferSize = 10000
    else if options.superfast
        readBufferSize = 500000
    else if options.fast
        readBufferSize = 5000000
    else
        readBufferSize = false

    # Get MD5 hash from file.
    getFileHash filepath, readBufferSize, (hash) ->
        saveHash hash, filepath if hash? and hash isnt ""
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

    folderTasks = []

    # Iterate and scan search folders.
    for folder in folders
        folderTasks.push (callback) -> scanFolder folder, callback

    # Run run run!
    async.parallelLimit folderTasks, 2

# Program called, starts here!
# -----------------------------------------------------------------------------
run()
