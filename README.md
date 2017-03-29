# Dedup.js


Quick and smart-ish tool to find and delete duplicate files. Written in Node.js / CoffeeScript.
Supports MD5, SHA1 and SHA512 to generate checksums.

Tested on OS X, Linux Ubuntu x86 and Windows 10 x64.

More info at https://github.com/igoramadas/dedup.js

### How to install

    $ sudo npm install -g dedup.js

### Usage

    $ dedup.js -help

#### Example

    $ dedup.js [options] directory1 directory2 other-directories...
