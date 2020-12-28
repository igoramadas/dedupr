# Dedupr

Quick and dirty Node.js tool to find (and delete) duplicate files. Not the fastest, not the most featured, not the most popular out there, and no voodoo involved. But it works pretty well, and can be used directly via the command line or imported as a library on your Node.js app.

## Features

- Can be used via command line or imported as a library
- Find duplicates based on file size, content hash and filenames (optional)
- Supports most common hashing algorithms (SHA1, SHA256, SHA512, MD4, MD5 etc)
- Delete duplicates automatically (optional)
- Results are exported to a JSON file

## How to install

To install globally on your machine please use:

    $ npm install dedupr -g

Or to install locally on your current project:

    $ npm install dedupr --save

## Command line usage

    $ dedupr -[options] folders

Detect duplicates on some user folders, using defaults:

    $ dedupr /home/joe /home/karen /home/sara

Detect duplicates on all user's home folders, verbose mode activated:

    $ dedupr -v /home

Delete duplicates on logged user's home folder, using the "fast" hashing preset:

    $ dedupr -d --fast ~/

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

const dedupr = new Dedupr(options)
await dedupr.run()

console.dir(dedupr.results)
```

## Options

### console

Enable or disable logging to the console. Enabled by default when using via the command line, but not when using it as a library / programatically.

### extensions *`-e`*

Array of file extensions that should be included. Defaults to all files.

### output *`-o`*

Save results to the specified output file. Defaults to `dedupr.json` on the current folder.

### reverse *`-r`*

Sort folders and files from Z to A to 0 (descending). By default, they are sorted alphabetically (ascending). Please note that this also changes the order of the passed folders, so the very last occurrence of a file will be the non-duplicate.

### filename *`-f`*

In addition to the hash value and file size, also consider the filename to find duplicates. Meaning files will identical contents but different filenames won't be marked as duplicates. Default is `false`.

### verbose *`-v`*

Activate verbose mode with extra logging. Defaults to `false`.

### delete *`-d`*

Delete duplicates. Only the very first occurrence of a file will remain (or very last, if `reverse` is set). **Use with caution!**

## Advanced options

### parallel *`-p`*

How many files should be hashed in parallel. Defaults to `5`.

### hashSize *`-s`*

How many bytes should be hashed from the beginning and the end of each file? Defaults to `2048`, meaning it uses the first and last 2MB of a file. Depending on your use case and the available CPU power, you might want to reduce this value.

### hashAlgorithm *`-h`*

Which hashing algorithm should be used. Default is `sha256`. Some of the other possible values: "sha1", "sha512", "md5", "blake2b512".

## Shortcut options

**Please note that the options below will always override the `hashSize` and `hashAlgorithm` values.**

### *`--crazyfast`*

Same as `-s 4 -h sha1`. Hashes the first and last 4KB of files, using SHA1. Use with caution, as this *might* catch some false positives.

### *`--veryfast`*

Same as `-s 64 -h sha1`. Hashes the first and last 64KB of files, using SHA1.

### *`--faster`*

Same as `-s 512 -h sha1`. Hashes the first and last 512KB of files, using SHA1.

### *`--fast`*

Same as `-s 1024 -h sha256`. Hashes the first and last 1MB of files, using SHA256.

### *`--safe`*

Same as `-s 32768 -h sha512`. Hashes the first and last 32MB of files, using SHA512. Might get pretty slow if you have many big media files.

## Need help?

Post an issue [here](https://github.com/igoramadas/dedupr/issues).
