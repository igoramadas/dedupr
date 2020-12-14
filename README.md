# Dedup.js

Quick and dirty tool to find and delete duplicate files. Using Node.js / CoffeeScript. Supports MD5, SHA-1 and SHA-512 to generate checksums.

Tested on OS X, Linux Ubuntu x86 and Windows 10 x64.

## How to install

    $ npm install -g dedup.js

## Usage

    $ dedup.js -help

## Examples

### Checksum first 10KB, using MD5, 3 distinct folders

    $ dedup.js -crazyfast -md5 /directory1 /directory2 /other-directories/something

### Checksum first 5MB, archive, subfolders of /home/user/photos

    $ dedup.js -faster -sub /home/user/photos

### Full checksum, using SHA-512, delete duplicates, 2 distinct folders

    $ dedup.js -sha512 -delete /home/user1/photos /home/user2/photos
