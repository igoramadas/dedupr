/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Required dependencies.
const async = require("async");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
// Get current executable folder.
const executableFolder = path.dirname(require.main.filename) + "/";
// Collection of file hashes (with or without filenames, depending on --filename option).
const fileHashes = {};
// List of duplicates.
const duplicates = [];
// List of folders to be scanned.
let folders = [];
// Create file processor queue (scan the file and get its hash based on options).
const queueProcessor = (filepath, callback) => scanFile(filepath, callback);
const fileQueue = async.queue(queueProcessor, 4);
// File processor queue will drain once we have processed all files.
fileQueue.drain = () => finished();
// Default options, will list duplicates only, using SHA1.
const options = {
    verbose: false,
    archiveDuplicates: false,
    removeDuplicates: false,
    fast: false,
    superfast: false,
    crazyfast: false,
    filename: false,
    reverse: false,
    log: false,
    subFolders: false,
    algorithm: "sha1"
};
// Set start time (Unix timestamp).
const startTime = Date.now();
// Show help on command line (dedupr -help).
const showHelp = function () {
    console.log("");
    console.log("dedupr <options> <folders>");
    console.log("");
    console.log("  -h        -help        help me (this screen)");
    console.log("  -v        -verbose     log things as they happen");
    console.log("  -a        -archive     move duplicates to the dedupr.archive folder");
    console.log("  -d        -delete      delete duplicates when found (use with care!)");
    console.log("  -l        -log         save list of duplicate files to dedup.log");
    console.log("  -f0       -fast        hash first 20MB only for better performance (safe)");
    console.log("  -f1       -faster      hash first 5MB only for better performance (mostly safe)");
    console.log("  -f2       -superfast   hash first 500KB only for max performance (safe-ish)");
    console.log("  -f3       -crazyfast   hash first 10KB only for max performance (unsafe)");
    console.log("  -fn       -filename    only consider duplicate files with the same filename");
    console.log("  -r        -reverse     reverse subfolders / files order (alphabetical order descending)");
    console.log("  -md5                   MD5 instead of SHA1 (slightly faster on legacy / old systems)");
    console.log("  -sha512                SHA512 instead of SHA1 (safest, potentially slower on 32bit)");
    console.log("  -sub                   use subfolders of the passed path (only works if passing a single folder)");
    console.log("");
    console.log("Please note that priority runs top to bottom. So superfast has preference");
    console.log("over fast, and sha512 has preference over md5, for example.");
    console.log("");
    console.log("When deleting duplicates, the first occurrence of a file is the one preserved.");
    console.log("So for example when passing dir1, dir2 and dir3, all having the exact same");
    console.log("structure, duplicate files will be deleted from dir2 and dir3.");
    console.log("");
    console.log("Examples:");
    console.log("");
    console.log("Get duplicates on home folder, check first 5MB only, match filenames");
    console.log("  $ dedupr -f1 -fn /home/user");
    console.log("");
    console.log("Delete duplicates on database folder, using md5");
    console.log("  $ dedupr -d -md5 /database");
    return console.log("");
};
// Get parameters from command line.
const getParams = function () {
    const params = Array.prototype.slice.call(process.argv, 2);
    // No parameters? Show help.
    if (params.length === 0) {
        showHelp();
        return process.exit(0);
    }
    for (let p of Array.from(params)) {
        switch (p) {
            case "-h":
            case "-help":
            case "--help":
                showHelp();
                return process.exit(0);
                break;
            case "-v":
            case "-verbose":
                options.verbose = true;
                break;
            case "-a":
            case "-archive":
                options.archiveDuplicates = true;
                break;
            case "-d":
            case "-delete":
                options.removeDuplicates = true;
                break;
            case "-l":
            case "-log":
                options.log = true;
                break;
            case "-f0":
            case "-fast":
                options.fast = true;
                break;
            case "-f1":
            case "-faster":
                options.faster = true;
                break;
            case "-f2":
            case "-superfast":
                options.superfast = true;
                break;
            case "-f3":
            case "-crazyfast":
                options.crazyfast = true;
                break;
            case "-fn":
            case "-filename":
                options.filename = true;
                break;
            case "-r":
            case "-reverse":
                options.reverse = true;
                break;
            case "-md5":
                options.algorithm = "md5";
                break;
            case "-sha512":
                options.algorithm = "sha512";
                break;
            case "-sub":
                options.subFolders = true;
                break;
            default:
                folders.push(p);
        }
    }
    // Exit if no folders were passed.
    if (folders.length < 1) {
        console.error("Abort! No folders were passed.");
        return process.exit(0);
    }
    // Subfolders option is only allowed for a single folder.
    if (options.subFolders) {
        if (folders.length > 1) {
            console.error("Using the option -sub is only allowed if you pass a single folder");
            return process.exit(0);
        }
        else {
            const mainFolder = folders[0];
            folders = fs.readdirSync(mainFolder);
            folders = folders.map((f) => path.join(mainFolder, f));
            folders = folders.filter((f) => fs.statSync(f).isDirectory());
            // Sort according to the reverse option.
            folders.sort();
            if (options.reverse) {
                return folders.reverse();
            }
        }
    }
    else {
        for (let f of Array.from(folders)) {
            if (f.substring(0, 1) === "-") {
                console.error(`Abort! Invalid option: ${f}. Use -help to get a list of available options.`);
                return process.exit(0);
            }
        }
    }
};
// Make sure the "target" directory exists by recursively iterating through directories.
const mkdirRecursive = (target) => {
    if (fs.existsSync(path.resolve(target))) {
        return;
    }
    var callback = function (p, made) {
        if (!made) {
            made = null;
        }
        p = path.resolve(p);
        try {
            fs.mkdirSync(p);
        }
        catch (ex) {
            if (ex.code === "ENOENT") {
                made = callback(path.dirname(p), made);
                callback(p, made);
            }
            else {
                let stat;
                try {
                    stat = fs.statSync(p);
                }
                catch (ex1) {
                    throw ex;
                }
                if (!stat.isDirectory()) {
                    throw ex;
                }
            }
        }
        return made;
    };
    return callback(target);
};
// Proccess file and generate its checksum.
const getFileHash = function (filepath, maxBytes, callback) {
    const hash = crypto.createHash(options.algorithm);
    const readStream = fs.createReadStream(filepath);
    let bytesRead = 0;
    // Finished reading file, close the stream and get digest.
    const finish = function () {
        let result = null;
        try {
            readStream.close();
            result = hash.digest("hex");
        }
        catch (ex) {
            console.error(`Error closing stream / hash for ${filepath}: ${ex}`);
        }
        return callback(result);
    };
    // Something went wrong? Close stream and return with empty callback.
    const reject = function (err) {
        console.error(`Error getting ${options.algorithm} hash for ${filepath}: ${err}`);
        try {
            readStream.close();
        }
        catch (ex) {
            console.error(`Error closing stream for ${filepath}: ${ex}`);
        }
        return callback(null);
    };
    // Append file data to the hash.
    readStream.on("data", function (data) {
        if (maxBytes && bytesRead + data.length > maxBytes) {
            hash.update(data.slice(0, maxBytes - bytesRead));
            return finish();
        }
        else {
            bytesRead += data.length;
            return hash.update(data);
        }
    });
    readStream.on("end", finish);
    return readStream.on("error", reject);
};
// Check duplicates based on the fileHashes collection.
const saveHash = function (hash, filepath) {
    let id = hash;
    // Consider filename for duplicates?
    if (options.filename) {
        id += `-${path.basename(filepath)}`;
    }
    let dup = filepath;
    const existing = fileHashes[id] || [];
    existing.push(filepath);
    fileHashes[id] = existing;
    // File already exists?
    if (existing.length < 2) {
        if (options.verbose) {
            return console.log(`File scanned: ${filepath} - ${hash}`);
        }
    }
    else {
        if (options.verbose) {
            console.log(`Duplicate found: ${filepath} - ${hash}`);
        }
        // Delete duplicates?
        if (options.removeDuplicates) {
            fs.unlink(filepath, function (err) {
                if (err != null) {
                    dup += " | error";
                    return console.error(`Could not delete ${filepath}: ${err}`);
                }
                else {
                    dup += " | deleted";
                    if (options.verbose) {
                        return console.log(`Deleted ${filepath}`);
                    }
                }
            });
            // Move duplicates to dedupr.archive folder?
        }
        else if (options.archiveDuplicates) {
            const newPath = executableFolder + "dedupr.archive" + filepath;
            mkdirRecursive(path.dirname(newPath));
            fs.rename(filepath, newPath, function (err) {
                if (err != null) {
                    dup += " | error";
                    return console.error(`Could not archive ${filepath}: ${err}`);
                }
                else {
                    dup += " | archived";
                    if (options.verbose) {
                        return console.log(`Archived ${filepath}`);
                    }
                }
            });
        }
        return duplicates.push(dup);
    }
};
// Verify and get hash for the specified file.
var scanFile = function (filepath, callback) {
    let readBufferSize;
    if (options.crazyfast) {
        readBufferSize = 10000;
    }
    else if (options.superfast) {
        readBufferSize = 500000;
    }
    else if (options.faster) {
        readBufferSize = 5000000;
    }
    else if (options.fast) {
        readBufferSize = 20000000;
    }
    else {
        readBufferSize = false;
    }
    // Get MD5 hash from file.
    return getFileHash(filepath, readBufferSize, function (hash) {
        if (hash != null && hash !== "") {
            saveHash(hash, filepath);
        }
        else {
            console.error(`Got an empty hash for: ${filepath}`);
        }
        return callback();
    });
};
// Scan a folder to match duplicates.
var scanFolder = function (folder, callback) {
    if (options.verbose) {
        console.log(`Scanning ${folder} ...`);
    }
    // Helper to scan folder contents (directories and files).
    const scanner = function (file) {
        const filepath = path.join(folder, file);
        try {
            const stats = fs.statSync(filepath);
            if (stats.isDirectory()) {
                return scanFolder(filepath);
            }
            else {
                return fileQueue.push(filepath);
            }
        }
        catch (ex) {
            return console.error(`Error reading ${filepath}: ${ex}`);
        }
    };
    // Make sure we have the correct folder path.
    if (!path.isAbsolute(folder)) {
        folder = executableFolder + folder;
    }
    try {
        let i;
        const contents = fs.readdirSync(folder);
        if (options.verbose) {
            console.log(`${folder} has ${contents.length} itens`);
        }
        if (options.reverse) {
            i = contents.length - 1;
            while (i >= 0) {
                scanner(contents[i]);
                i--;
            }
        }
        else {
            i = 0;
            while (i < contents.length) {
                scanner(contents[i]);
                i++;
            }
        }
        if (callback != null) {
            return callback(null);
        }
    }
    catch (error) {
        const ex = error;
        console.error(`Error reading ${folder}: ${ex}`);
        if (callback != null) {
            return callback(ex);
        }
    }
};
// Finished!
var finished = function (err, result) {
    const duration = (Date.now() - startTime) / 1000;
    console.log("");
    console.log(`Finished after ${duration} seconds!`);
    console.log(`${Object.keys(fileHashes).length} unique files`);
    console.log(`${duplicates.length} duplicates`);
    // Save output to dedup.log?
    if (options.log) {
        let logContents;
        if (options.removeDuplicates) {
            logContents = "Duplicate files found and deleted (an * before indicates error):\n\n";
        }
        else if (options.archiveDuplicates) {
            logContents = "Duplicate files found and archived (an * before indicates error):\n\n";
        }
        else {
            logContents = "Duplicate files found:\n\n";
        }
        logContents += duplicates.join("\n");
        fs.writeFileSync("dedup.log", logContents, "utf8");
        if (options.verbose) {
            console.log("Saved output to dedup.log");
        }
    }
    // Bye!
    return console.log("");
};
// Run it!
const run = function () {
    console.log("");
    console.log("########################################################");
    console.log("###                   - Dedup.js -                   ###");
    console.log("########################################################");
    console.log("");
    // First we get the parameters. If --help, it will end here.
    getParams();
    // Log current options.
    let optionsLog = [];
    for (let key in options) {
        const value = options[key];
        if (value) {
            optionsLog.push(`${key}=${value}`);
        }
    }
    optionsLog = optionsLog.join(", ");
    console.log(`Options: ${optionsLog}`);
    console.log("");
    const folderTasks = [];
    console.log("Will search for duplicates on:");
    // Iterate and scan search folders.
    for (let folder of Array.from(folders)) {
        console.log(folder);
        ((folder) => folderTasks.push((callback) => scanFolder(folder, callback)))(folder);
    }
    // Run run run!
    return async.parallelLimit(folderTasks, 2);
};
// Program called, starts here!
// -----------------------------------------------------------------------------
run();
