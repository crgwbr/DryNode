// Craig Weber <crgwbr@gmail.com>
//
// dry.js
// A simple node.js module to allow sharing of code between
// server-side and cliend-side applications

var fs   = require("fs");
var path = require("path");
var lib_path = "";
var client_require_url = "";

// To simplify things, this is a singleton.
// Given its nature, it shouldn't be a problem.
function DryNode(lib, require_url) {
    // Absolute Path to library folder
    lib_path = lib;
    // Relative URL that DryNode.client_require is served at. e.g. /require/ or /require.js
    client_require_url = require_url;
}

DryNode.prototype = {
    // Replaces the stock Node.js require function.
    // Automatically looks in previously set lib folder and adds .js
    // var jquery = drynode.require('jquery.min');
    require: function(filename) {
        var filepath = build_path(filename);
        return require(filepath);
    },
    // Serves client script to enable client-side require function
    // Same usage as server-side require
    client_require: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        var data = parse_querystring(req.url);
        if (data.lib === undefined) {
            // Serve require function
            res.write("var require = function(lib_name) { \n\
                if (localStorage['drynode-' + lib_name] === undefined) { \n\
                    var base_url = '" + client_require_url + "'; \n\
                    var url = base_url + '?lib=' + lib_name; \n\
                    var ajax = null; \n\
                    if (window.XMLHttpRequest) \n\
                        ajax = new XMLHttpRequest(); \n\
                    else \n\
                        ajax = new ActiveXObject('Microsoft.XMLHTTP'); \n\
                    if (ajax) { \n\
                        ajax.open('GET', url, false); \n\
                        ajax.send(null); \n\
                        var serialized_lib = ajax.responseText; \n\
                    } else { \n\
                        return false; \n\
                    } \n\
                    localStorage['drynode-' + lib_name] = serialized_lib; \n\
                } else { \n\
                    var serialized_lib = localStorage['drynode-' + lib_name]; \n\
                } \n\
                var lib = eval(serialized_lib); \n\
                return lib; \n\
            } \n\
            String.prototype.require = function() { \n\
                return window.require(this); \n\
            }");
            res.end();
            return
        } else {
            // Start function wrapper
            res.write("(function(){ \n\
                var exports = {}; \n\
                // Begin function\n");
            // Sanitize
            var filepath = build_path(data.lib);
            // Check if the file exisits
            path.exists(filepath, function(exists) {  
                if (exists) {
                    fs.readFile(filepath, "binary", function(err, file) {
                        res.write(file, "binary");
                        res.write("return exports; })();");
                        res.end();
                    });
                } else {
                    res.write("return exports; })();");
                    res.end();
                }
            });
        }
    },
    client_loader: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/javascript'});
        res.write("// DryNode- Server-side / Client-side code sharing for node.js\n// Craig Weber <crgwbr@gmail.com>\n");
        if (req.url.indexOf('?') != -1) {
            var scripts = req.url.split('?')[1];
            scripts = scripts.split('|');
            // Loop through scripts
            var i = 0;
            (function concat() {
                var filename = scripts[i];
                if (filename == undefined || filename == null) {
                    res.end();
                    return;
                }
                // Function to move to next file
                var next = function() {
                    // Next file
                    if (i<scripts.length) {
                        i++;
                        concat();
                    }
                }
                // Sanitize
                var filepath = build_path(filename);
                // Check if the file exisits
                path.exists(filepath, function(exists) {  
                    if (exists) {
                        fs.readFile(filepath, "binary", function(err, file) {
                            res.write("\n// From " + filename + "\n");
                            res.write(file, "binary");
                            next();
                        });
                    } else {
                        next();
                    }
                });
            })();
        }
    },
    test_html: function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<script type="text/javascript" src="/dry_node.js?test2|test3"></script>');
        res.write('<script type="text/javascript" src="/require.js"></script>');
        res.write('<script type="text/javascript"> \n\
            var test1 = require("test1"); \n\
            console.log(test1); \n\
            console.log(test1.test()); \n\
        </script>');
        res.end();
    }
}

// Misc functions
function build_path(filename) {
    filename = filename.replace('..', '');
    filename = filename.replace('/', '');
    filename = filename + '.js';
    return path.join(lib_path, filename);
}

function parse_querystring(url) {
    if (url.indexOf('?') != -1) {
        var query_string = url.split('?')[1];
        var items = query_string.split('&');
        var obj = {};
        for (var i=0; i<items.length; i++) {
            var item = items[i].split('=');
            var key = item[0];
            var value = item[1];
            obj[key] = value;
        }
        return obj;
    } else {
        return {}
    }
}

exports.DryNode = DryNode;