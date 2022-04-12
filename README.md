# Dedupr

Quick and dirty Node.js tool to find (and delete) duplicate files. Not the fastest, not the most featured, not the most popular out there, and no voodoo involved. But it works well enough, and can be used directly via the command line or imported as a library on your Node.js app.

## Features

-   Can be used via command line or imported as a library
-   Find duplicates based on file size, content hash and filenames (optional)
-   Supports most common hashing algorithms (SHA1, SHA256, SHA512, MD4, MD5 etc)
-   Delete duplicates automatically (optional)
-   Results are exported to a JSON file

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

Delete duplicate images considering filenames, reverse order, MD5 hashing only the first and last 1KB of files (hash size 2KB):

    $ dedupr -o /home/custom-dedupr-output.json \
             -e jpg gif png bmp \
             -s 2
             -h md5
             -f -r -d
             ~/photos ~/camera ~/pictures ~/downloads

## Importing as a library

```typescript
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

### folders

List of folders that should be scanned. On the command line, these are the last arguments to be passed. If any of these folders do not exist, the tool will throw an exception.

By default, duplicates will be detected based on alphabetical / ascending order. If you pass /folderA, folderB and folderC, in that order, duplicates will be flagged on folderB and folderC only. If a file is present on folderB and folderC, the one inside folderC will be flagged. This behaviour can be changed with the `reverse` option.

### extensions _`-e`_

Array of file extensions that should be included. Defaults to all files.

### output _`-o`_

Save results to the specified output file. Defaults to `dedupr.json` on the current folder. If you want to disable saving the output, set this to `false`

### reverse _`-r`_

Sort folders and files from Z to A to 0 (descending). By default, they are sorted alphabetically (ascending). Please note that this also changes the order of the passed folders, so the very last occurrence of a file will be the non-duplicate.

### filename _`-f`_

In addition to the hash value and file size, also consider the filename to find duplicates. Meaning files will identical contents but different filenames won't be marked as duplicates. Default is `false`.

### verbose _`-v`_

Activate verbose mode with extra logging. Defaults to `false`.

### delete _`-d`_

Delete duplicates. Only the very first occurrence of a file will remain (or very last, if `reverse` is set). **Use with caution!**

## Advanced options

### parallel _`-p`_

How many files should be hashed in parallel. Defaults to `3`.

### hashSize _`-s`_

How many bytes should be hashed from each file? Defaults to `2048`, meaning it uses the first and last 1MB of a file. Depending on your use case and the available CPU power, you might want to reduce this value.

### hashAlgorithm _`-h`_

Which hashing algorithm should be used. Default is `sha256`. Some of the other possible values: "sha1", "sha512", "md5", "blake2b512".

## Shortcut options

**Please note that the options below will always override the `hashSize` and `hashAlgorithm` values.**

### _`--crazyfast`_

Same as `-s 4 -h sha1`. Hashes the first and last 2KB of files, using SHA1. Use with caution, as this _might_ catch some false positives.

### _`--veryfast`_

Same as `-s 64 -h sha1`. Hashes the first and last 32KB of files, using SHA1.

### _`--faster`_

Same as `-s 512 -h sha1`. Hashes the first and last 256KB of files, using SHA1.

### _`--fast`_

Same as `-s 1024 -h sha256`. Hashes the first and last 512KB of files, using SHA256.

### _`--safe`_

Same as `-s 32768 -h sha256`. Hashes the first and last 16MB of files, using SHA256. Might be a bit slow if you have many media files.

### _`--safer`_

Same as `-s 131072 -h sha512`. Hashes the first and last 64MB of files, using SHA512. Very slow if you have many media files.

## Need help?

Post an issue [here](https://github.com/igoramadas/dedupr/issues).
