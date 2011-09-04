// Craig Weber <crgwbr@gmail.com>
// http://crgwbr.com
//
// dry.js
// A simple node.js module to allow sharing of code between
// server-side and client-side applications

var fs   = require("fs");
var path = require("path");

var enable_caching = "true";
var cache_length = "86400";  // 1 day
var lib_path = "";
var client_require_url = "";
var client_code = {};

// To simplify things, this is a singleton.
// Given its nature, it shouldn't be a problem.
function DryNode(lib, require_url) {
    // Absolute Path to library folder
    lib_path = lib;
    // Relative URL that DryNode.client_require is served at. e.g. /require/ or /require.js
    client_require_url = require_url;
    // Bake urls into client code
    generate_client_code()
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
            res.write(client_code.require);
            res.end();
            return
        } else {
            // Start function wrapper
            res.write(client_code.start_lib_wrapper);
            // Sanitize
            var filepath = build_path(data.lib);
            // Check if the file exisits
            path.exists(filepath, function(exists) {  
                if (exists) {
                    fs.readFile(filepath, "binary", function(err, file) {
                        res.write(file, "binary");
                        res.write(client_code.end_lib_wrapper);
                        res.end();
                    });
                } else {
                    res.write(client_code.end_lib_wrapper);
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
        // Demo Client Side Require Function
        res.write('<script type="text/javascript" src="/require.js"></script>');
        res.write('<script type="text/javascript"> \n\
            var test1 = require("test1"); \n\
            test1.test(); \n\
        </script>');
        // Demo library concat
        res.write('<script type="text/javascript" src="/dry_node.js?test2|test3"></script>');
        res.end();
    }
}

// ============================================================================
// Misc functions
// ============================================================================

// Build and sanitize path to the lib folder
function build_path(filename) {
    filename = filename.replace('..', '');
    filename = filename.replace('/', '');
    filename = filename + '.js';
    return path.join(lib_path, filename);
}

// Parse a url or url query string into an object of key/value pairs.
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

// ============================================================================
// Client Side Code
// Its served to the clientwith resp.write(), thus it's in a string.
// WRapped in a function since the base urls need baked into these strings
// ============================================================================
function generate_client_code() {
    client_code.require = "var require = function(lib_name) { \n\
            var cache_key = 'drynode-' + lib_name; \n\
            var expire_key = cache_key + '-expires'; \n\
            var refresh_cache = true; \n\
            var cache_length = " + cache_length + "; \n\
            if (localStorage[expire_key] != undefined) \n\
                refresh_cache = parseInt(localStorage[expire_key]) + cache_length < (+ new Date()); \n\
            if (!" + enable_caching + " || (localStorage[cache_key] === undefined || refresh_cache)) { \n\
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
                localStorage[cache_key] = serialized_lib; \n\
                localStorage[expire_key] = (+ new Date()) + cache_length; \n\
            } else { \n\
                var serialized_lib = localStorage[cache_key]; \n\
            } \n\
            try { \n\
                var lib = eval(serialized_lib); \n\
                return lib; \n\
            } catch (err) { \n\
                console.log(err); \n\
                console.log(serialized_lib); \n\
            } \n\
        } \n\
        String.prototype.require = function() { \n\
            return window.require(this); \n\
        }";

    client_code.start_lib_wrapper = "(function(){ \n\
        var exports = {}; \n\
        // Begin function\n";
    
    client_code.end_lib_wrapper = "return exports; })();";
}

exports.DryNode = DryNode;