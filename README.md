# Dedupr

Quick and dirty Node.js tool to find (and delete) duplicate files. Not the fastest, not the most featured, not the most popular out there. No voodoo or magic involved. But it works pretty well, and can be used directly via the command line or imported as a library on your Node.js app.

Tested on OS X, Linux Ubuntu x86 and Windows 10 x64.

## How to install

To install globally on your machine please use:

    $ npm install dedupr -g

Or to install locally on your current project:

    $ npm install dedupr --save

## Command line usage

    $ dedupr -[options] folders

Detect duplicates on specific folders, using defaults:

    $ dedupr /home/joe /home/karen /home/sara

Detect duplicates on all user's home folders, with verbose mode:

    $ dedupr -v -u /home

Delete duplicates on logged user's home folder, doing with the fast hashing preset:

    $ dedupr -d -u --fast ~/

Delete duplicate images considering filenames, reverse order, MD5 hashing only the first and last 2KB of files:

    $ dedupr -f -r -d
             -o /home/custom-dedupr-output.json \
             -e jpg gif png bmp \
             -s 2
             -h md5
             ~/photos ~/camera ~/pictures ~/downloads

## Importing as a library

```javascript
import Dedupr from "dedupr"
// const Dedupr = require("dedupr").default

const options = {
    console: true,
    folders: ["/home/user1/photos", "/home/user2/photos", "/home/user3/photos"],
    hashAlgorithm: "sha1"
}

const deduplicator = new Dedupr(options)
await deduplicator.run()

console.dir(deduplicator.results)
```

## Options

### console

Enable or disable logging to the console. Enabled by default, but you can disable it programatically. **Important:** if you disable the console logging, any error or exception found will get thrown instead, and might potentially stop the file scanning.

### extensions *`-e`*

File extensions should be scanned. Defaults to all files.

### output *`-o`*

Save results to the specified output file. Defaults to `dedupr.json` on the current folder.

### parallel *`-p`*

How many files can be processed in parallel. Defaults to `5`.

### hashSize *`-s`*

How many bytes should be hashed from the beginning and the end of each file? By default it only considers the first and last 2MB of a file, which should be safe enough for the vast majority of cases.

### hashAlgorithm *`-h`*

Which hashing algorithm should be used. Default is `sha1`. Some of the other possible values: "sha224", "sha256", "sha512", "md5", "blake2b512".

### filename *`-f`*

In addition to the hashing, also consider the filename to find duplicates. Meaning files will identical contents but different filenames won't be marked as duplicates. Default is `false`.

### reverse *`-r`*

Sort folders and files from Z to A to 0 (descending). By default, they are sorted alphabetically (ascending). Please note that this also changes the order of the passed folders, so the very last occurrence of a file will be the non-duplicate.

### verbose *`-v`*

Activate verbose mode with extra logging. Defaults to `false`.

### delete *`-d`*

Delete duplicates. Only the very first occurrence of a file will remain (or very last, if `reverse` is set). **Use with caution!**

## Shortcut options

### *`--crazyfast`*

Same as `-s 4 -h sha1`. Hashes only first and last 4KB of files, using SHA1. Use with caution, as this might catch some false positives.

### *`--veryfast`*

Same as `-s 64 -h sha1`. Hashes only first and last 64KB of files, using SHA1.

### *`--faster`*

Same as `-s 512 -h sha1`. Hashes only first and last 512KB of files, using SHA1.

### *`--fast`*

Same as `-s 1024 -h sha256`. Hashes only first and last 1MB of files, using SHA256.

### *`--safe`*

Same as `-s 32768 -h sha512`. Hashes only first and last 32MB of files, using SHA512.

## Need help?

Post an issue [here](https://github.com/igoramadas/dedupr/issues).
