#!/usr/bin/env node

var path = require("path");
var fs = require("fs");
var dir = path.join(path.dirname(fs.realpathSync(__filename)), "../");
require(dir + "index.js");