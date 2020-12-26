"use strict";
// COMMAND LINE WRAPPER
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const utils_1 = require("./utils");
const index_1 = __importDefault(require("./index"));
const yargs = require("yargs");
const yargsIntance = require("yargs/yargs");
// Unhandled rejections goes here.
process.on("unhandledRejection", (err) => {
    console.error("FATAL ERROR!");
    console.error(err);
    return process.exit();
});
module.exports = async function () {
    const argOptions = yargsIntance(process.argv.slice(2)).options({
        u: { alias: "subfolders", type: "boolean", describe: "If a single folder is passed, use its subfolders as the source folders" },
        e: { alias: "extensions", type: "array", describe: "Allowed file extensions, default is all extensions" },
        o: { alias: "output", type: "string", describe: "Full path to the JSON output file, default is dedupr.json" },
        s: { alias: "size", type: "number", describe: "How much data from each file should be hashed, default is 80000 (80MB)" },
        h: { alias: "hash", type: "string", describe: "Hash algorithm, default is sha256" },
        v: { alias: "verbose", type: "boolean", describe: "Verbose mode with extra logging" },
        r: { alias: "reverse", type: "boolean", describe: "Reverse the folders and files order (alphabetically descending)" },
        f: { alias: "filename", type: "boolean", describe: "Also consider filenames to check if a file is a duplicate" },
        d: { alias: "delete", type: "boolean", describe: "Delete duplicate files" },
        crazyfast: { type: "boolean", describe: "Shortcut to --size 100, --hash sha1" },
        veryfast: { type: "boolean", describe: "Shortcut to --size 1000, --hash sha1" },
        faster: { type: "boolean", describe: "Shortcut to --size 5000, --hash sha1" },
        fast: { type: "boolean", describe: "Shortcut to --size 20000, --hash sha256" },
        safe: { type: "boolean", describe: "Shortcut to --size 1000000, --hash sha512" }
    });
    // Command line options.
    argOptions.env("DEDUPR");
    argOptions.wrap(Math.min(100, yargs.terminalWidth()));
    // Examples.
    argOptions.usage(`Usage: $0 -[options...] folders...`);
    argOptions.epilog("Need help? More info at https://github.com/igoramadas/dedupr");
    // Transform arguments to options.
    let options = {
        console: true,
        folders: argOptions.argv._,
        subFolders: utils_1.hasValue(argOptions.argv.u) ? argOptions.argv.u : null,
        extensions: utils_1.hasValue(argOptions.argv.e) ? argOptions.argv.e : null,
        output: utils_1.hasValue(argOptions.argv.o) ? argOptions.argv.o : null,
        hashSize: utils_1.hasValue(argOptions.argv.s) ? argOptions.argv.s : null,
        hashAlgorithm: utils_1.hasValue(argOptions.argv.h) ? argOptions.argv.h : null,
        verbose: utils_1.hasValue(argOptions.argv.v) ? argOptions.argv.v : null,
        reverse: utils_1.hasValue(argOptions.argv.r) ? argOptions.argv.r : null,
        filename: utils_1.hasValue(argOptions.argv.f) ? argOptions.argv.f : null,
        delete: utils_1.hasValue(argOptions.argv.d) ? argOptions.argv.d : null
    };
    // Hash size shortcuts (crazyfast 100KB, superfast 1MB, faster 5MB, fast 20MB).
    if (argOptions.argv.crazyfast) {
        options.hashSize = 100;
        options.hashAlgorithm = "sha1";
    }
    else if (argOptions.argv.veryfast) {
        options.hashSize = 1000;
        options.hashAlgorithm = "sha1";
    }
    else if (argOptions.argv.faster) {
        options.hashSize = 5000;
        options.hashAlgorithm = "sha1";
    }
    else if (argOptions.argv.fast) {
        options.hashSize = 20000;
        options.hashAlgorithm = "sha256";
    }
    else if (argOptions.argv.safe) {
        options.hashSize = 1000000;
        options.hashAlgorithm = "sha512";
    }
    // Do it baby!
    const dedupr = new index_1.default(options);
    await dedupr.run();
};
