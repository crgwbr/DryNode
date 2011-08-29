// Craig Weber <crgwbr@gmail.com>
//
// dry.js
// A simple node.js module to allow sharing of code between
// server-side and cliend-side applications

var fs   = require("fs");
var path = require("path");
var lib_path = "";

function DryNode(lib) {
    // Absolute Path to library folder
    lib_path = lib;
}

DryNode.prototype = {
    require: function(filename) {
        filename = filename.replace('..', '');
        filename = filename.replace('/', '');
        filename = filename + '.js';
        var filepath = path.join(lib_path, filename);
        return require(filepath);
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
                filename = filename.replace('..', '');
                filename = filename.replace('/', '');
                filename = filename + '.js';
                var filepath = path.join(lib_path, filename);
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
        res.write('<script type="text/javascript" src="/dry_node.js?test1|jquery|test2|test3"></script>');
        res.end();
    }
}

exports.DryNode = DryNode;