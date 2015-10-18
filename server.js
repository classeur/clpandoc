var spawn = require('child_process').spawn;
var fs = require('fs');
var cluster = require('cluster');
var express = require('express');
var app = express();
var tmp = require('tmp');

var timeout = process.env.PANDOC_TIMEOUT || 60000;

var outputFormats = [
    'asciidoc',
    'epub',
    'epub3',
    'latex',
    'odt',
    'pdf',
    'rst',
    'rtf',
    'textile',
    'docx',
];

var disabledExtensions = [
    'blank_before_header',
    'header_attributes',
    'implicit_header_references',
    'blank_before_blockquote',
    'line_blocks',
    'fancy_lists',
    'example_lists',
    'table_captions',
    'simple_tables',
    'multiline_tables',
    'grid_tables',
    'pandoc_title_block',
    'inline_code_attributes',
    'markdown_in_html_blocks',
    'shortcut_reference_links',
    'citations',
];

var enabledExtensions = [
    'lists_without_preceding_blankline',
];

var switchableExtensions = [
    'fenced_code_blocks',
    'backtick_code_blocks',
    'fenced_code_attributes',
    'definition_lists',
    'pipe_tables',
    'strikeout',
    'superscript',
    'subscript',
    'tex_math_dollars',
    'tex_math_double_backslash',
    'footnotes',
    'inline_notes',
    'hard_line_breaks',
    'autolink_bare_uris',
    'abbreviations',
];

var baseInputFormat = 'markdown';
baseInputFormat = disabledExtensions.reduce(function(baseInputFormat, disabledExtension) {
    return baseInputFormat + '-' + disabledExtension;
}, baseInputFormat);
baseInputFormat = enabledExtensions.reduce(function(baseInputFormat, enabledExtension) {
    return baseInputFormat + '+' + enabledExtension;
}, baseInputFormat);

app.post('/', function(req, res, next) {

    var extensions, params = [];
    var outputFormat = req.query.format;
    outputFormat = outputFormats.indexOf(outputFormat) !== -1 ? outputFormat : 'pdf';
    try {
        extensions = JSON.parse(req.query.extensions);
    } catch (e) {
        extensions = {};
    }

    var inputFormat = switchableExtensions.reduce(function(inputFormat, switchableExtension) {
        return inputFormat + (extensions[switchableExtension] ? '+' : '-') + switchableExtension;
    }, baseInputFormat);

    params.push('--webtex=http://chart.apis.google.com/chart?cht=tx\&chf=bg,s,FFFFFF00\&chco=000000\&chl=');
    if (extensions.typographer) {
        params.push('--smart');
    }

    tmp.file({
        postfix: outputFormat === 'pdf' ? '.pdf' : ''
    }, function(err, path, fd, cleanupCallback) {
        if (err) {
            return next(err);
        }

        var pandocError = '';

        function onError(err) {
            cleanupCallback();
            next(err);
        }

        function onPandocError() {
            res.statusCode = 400;
            cleanupCallback();
            pandocError = pandocError || 'Unknown error';
            console.error(pandocError);
            res.end(pandocError);
        }

        function onTimeout() {
            res.statusCode = 408;
            cleanupCallback();
            res.end('Request timeout');
        }

        var binPath = process.env.PANDOC_PATH || '/root/.cabal/bin/pandoc';
        outputFormat = outputFormat === 'pdf' ? 'latex' : outputFormat;
        params.push('-f', inputFormat, '-t', outputFormat, '--highlight-style', 'kate', '-o', path);
        var pandoc = spawn(binPath, params, {
            stdio: [
                'pipe',
                'ignore',
                'pipe'
            ]
        });
        var timeoutId = setTimeout(function() {
            timeoutId = undefined;
            pandoc.kill();
        }, timeout);
        pandoc.on('error', onError);
        pandoc.stdin.on('error', onError);
        pandoc.stderr.on('data', function(data) {
            pandocError += data.toString();
        });
        pandoc.on('close', function(code) {
            if (!timeoutId) {
                return onTimeout();
            }
            clearTimeout(timeoutId);
            if (code) {
                return onPandocError();
            }
            var readStream = fs.createReadStream(path);
            readStream.on('open', function() {
                readStream.pipe(res);
            });
            readStream.on('close', function() {
                cleanupCallback();
            });
            readStream.on('error', onPandocError);
        });
        req.pipe(pandoc.stdin);
    });
});

if (process.env.USE_CLUSTER && cluster.isMaster) {
    var count = require('os').cpus().length;
    for (var i = 0; i < count; i++) {
        cluster.fork();
    }
    cluster.on('exit', function() {
        console.log('Worker died. Spawning a new process...');
        cluster.fork();
    });
} else {
    var port = 3000;
    app.listen(port, function() {
        console.log('HTTP server started: http://localhost:' + port);
    });
}
