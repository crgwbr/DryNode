// Craig Weber <crgwbr@gmail.com>
//
// Example Node.js App using dry.js for code sharing
// between server-side and client-side code.

var http = require('http');

// Require DryNode and set the library folder
var DryNode = require(__dirname + '/dry.js');
var dry = new DryNode.DryNode(__dirname + '/lib/', '/require.js');

// Testing server side sharing
var test = dry.require('test1');

// Regex's to resolve URL's to view functions
var urls = [
    // Actual function to include for loading javascript in client apps
    ['^/dry_node.js$', dry.client_loader],
    
    // Function for client-side require
    ['^/require.js$', dry.client_require],
    
    // Html page to test Client side JS loading
    ['^/test.html$',   dry.test_html],
    
    // Html page to test server side execution of shared code
    ['^/server-side-code/$', function(req, res) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(test.test());
        res.end();
    }]
];


// Resolve a URL, return a function OR undefined
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


// Create server and serve URLs
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