// COMMAND LINE WRAPPER

import {hasValue, logError} from "./utils"
import Dedupr from "./index"
import yargs = require("yargs")
import yargsIntance = require("yargs/yargs")

// Unhandled rejections goes here.
process.on("unhandledRejection", (err) => {
    console.error("FATAL ERROR!")
    console.error(err)
    return process.exit()
})

export = async function () {
    const argOptions = yargsIntance(process.argv.slice(2)).options({
        e: {alias: "extensions", type: "array", describe: "Allowed file extensions, default is all extensions"},
        o: {alias: "output", type: "string", describe: "Full path to the JSON output file, default is dedupr.json"},
        p: {alias: "parallel", type: "number", describe: "How many files processed in parallel (default 5)"},
        s: {alias: "size", type: "number", describe: "How much data (kilobytes) to hash from start and end of each file"},
        h: {alias: "hash", type: "string", describe: "Hash algorithm, default is sha1"},
        v: {alias: "verbose", type: "boolean", describe: "Verbose mode with extra logging"},
        r: {alias: "reverse", type: "boolean", describe: "Reverse the folders and files order (alphabetically descending)"},
        f: {alias: "filename", type: "boolean", describe: "Also consider filenames to check if a file is a duplicate"},
        d: {alias: "delete", type: "boolean", describe: "Delete duplicate files"},
        crazyfast: {type: "boolean", describe: "Shortcut to --size 4, --hash sha1"},
        veryfast: {type: "boolean", describe: "Shortcut to --size 64, --hash sha1"},
        faster: {type: "boolean", describe: "Shortcut to --size 512, --hash sha1"},
        fast: {type: "boolean", describe: "Shortcut to --size 1024, --hash sha256"},
        safe: {type: "boolean", describe: "Shortcut to --size 32768, --hash sha512"}
    })

    // Option grouping.
    argOptions.group(["e", "o", "r", "f", "d"], "Options:")
    argOptions.group(["p", "s", "h"], "Advanced:")
    argOptions.group(["crazyfast", "veryfast", "faster", "fast", "safe"], "Shortcuts:")

    // Command line options.
    argOptions.env("DEDUPR")
    argOptions.wrap(Math.min(100, yargs.terminalWidth()))

    // Examples.
    argOptions.usage(`Usage: $0 -[options...] folders...`)
    argOptions.example(`$ $0 --fast ~/`, "")
    argOptions.example(`$ $0 --veryfast -e jpg gif png ~/photos ~/camera ~/downloads`, "")
    argOptions.example(`$ $0 -f -d -h sha512 -o duplicate-report.json /backup`, "")
    argOptions.example(`$ $0 -h md5 -s 16 /var`, "")
    argOptions.epilog("Need help? More info at https://github.com/igoramadas/dedupr")
    argOptions.help().demandCommand(1, "")

    // Transform arguments to options.
    let options: Options = {
        console: true,
        folders: argOptions.argv._ as string[],
        extensions: hasValue(argOptions.argv.e) ? (argOptions.argv.e as string[]) : null,
        output: hasValue(argOptions.argv.o) ? argOptions.argv.o : null,
        parallel: hasValue(argOptions.argv.p) ? argOptions.argv.p : null,
        hashSize: hasValue(argOptions.argv.s) ? argOptions.argv.s : null,
        hashAlgorithm: hasValue(argOptions.argv.h) ? argOptions.argv.h : null,
        verbose: hasValue(argOptions.argv.v) ? argOptions.argv.v : null,
        reverse: hasValue(argOptions.argv.r) ? argOptions.argv.r : null,
        filename: hasValue(argOptions.argv.f) ? argOptions.argv.f : null,
        delete: hasValue(argOptions.argv.d) ? argOptions.argv.d : null
    }

    // Hash size shortcuts (crazyfast 4KB MD5, superfast 64KB SHA1, faster 512KB SHA1, fast 1MB SHA1, safe 48MB SHA412).
    if (argOptions.argv.crazyfast) {
        options.hashSize = 4
        options.hashAlgorithm = "sha1"
    } else if (argOptions.argv.veryfast) {
        options.hashSize = 64
        options.hashAlgorithm = "sha1"
    } else if (argOptions.argv.faster) {
        options.hashSize = 512
        options.hashAlgorithm = "sha1"
    } else if (argOptions.argv.fast) {
        options.hashSize = 1024
        options.hashAlgorithm = "sha256"
    } else if (argOptions.argv.safe) {
        options.hashSize = 32768
        options.hashAlgorithm = "sha512"
    }

    // Do it baby!
    try {
        const dedupr = new Dedupr(options)
        await dedupr.run()
    } catch (ex) {
        logError(options, `Failure to run`, ex)
    }
}
