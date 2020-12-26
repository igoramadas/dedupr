# Dedupr

Quick and dirty Node.js tool to find and delete duplicate files. Supports MD5, SHA-1 and SHA-512 to generate checksums.

Tested on OS X, Linux Ubuntu x86 and Windows 10 x64.

## How to install

    $ npm install -g dedupr

## Usage

    $ dedupr -help

## Examples

### Checksum first 10KB, using MD5, 3 distinct folders

    $ dedupr -crazyfast -md5 /directory1 /directory2 /other-directories/something

### Checksum first 5MB, archive, subfolders of /home/user/photos

    $ dedupr -faster -sub /home/user/photos

### Full checksum, using SHA-512, delete duplicates, 2 distinct folders

    $ dedupr -sha512 -delete /home/user1/photos /home/user2/photos
