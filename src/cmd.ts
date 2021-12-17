// COMMAND LINE WRAPPER

import {hasValue, logError} from "./utils"
import Dedupr from "./index"
import yargs from "yargs"
import yargsIntance from "yargs/yargs"

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
        v: {alias: "verbose", type: "boolean", describe: "Verbose mode with extra logging"},
        r: {alias: "reverse", type: "boolean", describe: "Reverse the folders and files order (alphabetically descending)"},
        f: {alias: "filename", type: "boolean", describe: "Also consider filenames to check if a file is a duplicate"},
        d: {alias: "delete", type: "boolean", describe: "Delete duplicate files"},
        p: {alias: "parallel", type: "number", describe: "How many files processed in parallel (default 3)"},
        s: {alias: "size", type: "number", describe: "How much data (kilobytes) to hash from start and end of each file"},
        h: {alias: "hash", type: "string", describe: "Hash algorithm, default is sha1"},
        crazyfast: {type: "boolean", describe: "Shortcut to --size 4, --hash sha1"},
        veryfast: {type: "boolean", describe: "Shortcut to --size 64, --hash sha1"},
        faster: {type: "boolean", describe: "Shortcut to --size 512, --hash sha1"},
        fast: {type: "boolean", describe: "Shortcut to --size 1024, --hash sha256"},
        safe: {type: "boolean", describe: "Shortcut to --size 32768, --hash sha256"},
        safer: {type: "boolean", describe: "Shortcut to --size 131072, --hash sha512"}
    })

    // Arguments shortcut.
    const argv = argOptions.parseSync()

    // Option grouping.
    argOptions.group(["e", "o", "r", "f", "d"], "Options:")
    argOptions.group(["p", "s", "h"], "Advanced options:")
    argOptions.group(["crazyfast", "veryfast", "faster", "fast", "safe"], "Shortcuts:")

    // Command line options.
    argOptions.env("DEDUPR")
    argOptions.wrap(Math.min(100, yargs.terminalWidth()))

    // Examples.
    argOptions.usage(`Usage: $0 -[options...] folders...`)
    argOptions.example(`$ $0 --fast ~/`, "")
    argOptions.example(`$ $0 -e jpg gif png --veryfast ~/photos ~/camera ~/downloads`, "")
    argOptions.example(`$ $0 -f -d -h sha512 -o duplicate-report.json /backup`, "")
    argOptions.example(`$ $0 -h md5 -s 16 /var`, "")
    argOptions.epilog("Need help? More info at https://github.com/igoramadas/dedupr")
    argOptions.help().demandCommand(1, "")

    // Transform arguments to options.
    let options: Options = {
        console: true,
        folders: argv._ as string[],
        extensions: hasValue(argv.e) ? (argv.e as string[]) : null,
        output: hasValue(argv.o) ? argv.o : null,
        verbose: hasValue(argv.v) ? argv.v : null,
        reverse: hasValue(argv.r) ? argv.r : null,
        filename: hasValue(argv.f) ? argv.f : null,
        delete: hasValue(argv.d) ? argv.d : null,
        parallel: hasValue(argv.p) ? argv.p : null,
        hashSize: hasValue(argv.s) ? argv.s : null,
        hashAlgorithm: hasValue(argv.h) ? argv.h : null
    }

    // Hash size shortcuts (crazyfast 4KB, superfast 64KB, faster 512KB, fast 1MB, safe 32MB, safer 128MB).
    if (argv.crazyfast) {
        options.hashSize = 4
        options.hashAlgorithm = "sha1"
    } else if (argv.veryfast) {
        options.hashSize = 64
        options.hashAlgorithm = "sha1"
    } else if (argv.faster) {
        options.hashSize = 512
        options.hashAlgorithm = "sha1"
    } else if (argv.fast) {
        options.hashSize = 1024
        options.hashAlgorithm = "sha256"
    } else if (argv.safe) {
        options.hashSize = 32768
        options.hashAlgorithm = "sha256"
    } else if (argv.safer) {
        options.hashSize = 131072
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
