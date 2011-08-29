// Craig Weber <crgwbr@gmail.com>
//
// Example Node.js App using dry.js for code sharing
// between server-side and client-side code.

var http = require('http');
var DryNode = require(__dirname + '/dry.js');
var dry = new DryNode.DryNode(__dirname + '/lib/');

var urls = [
    ['^/dry_node.js$', dry.loader],
    ['^/test.html$',   dry.test],
];

function resolve(url, urls) {
    // Match a url
    // Return a url, or undefined
    if (url.indexOf('?') != -1)
        url = url.split('?')[0];
    for(var i=0; i<urls.length; i++) {
        var regex = new RegExp(urls[i][0]);
        var view  = urls[i][1];
        var match = url.match(regex);
        if (match != null) {
            return view;
        }
    }
    return undefined;
}

http.createServer(function (req, res) {
    // Match a url and call a view
    var view = resolve(req.url, urls);
    if (view) {
        view(req, res);
    } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('Cannot find ' + req.url);
    }
    
}).listen(1337, "127.0.0.1");

console.log('Server running at http://127.0.0.1:1337/');