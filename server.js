/* eslint no-console:0 */
var spawn = require('child_process').spawn
var fs = require('fs')
var cluster = require('cluster')
var express = require('express')
var bodyParser = require('body-parser')
var tmp = require('tmp')

var app = express()
app.use(bodyParser.json())

var timeout = process.env.PANDOC_TIMEOUT || 60000

var outputFormats = [
	'asciidoc',
	'context',
	'epub',
	'epub3',
	'latex',
	'odt',
	'pdf',
	'rst',
	'rtf',
	'textile',
	'docx',
]

var highlightStyles = [
	'pygments',
	'kate',
	'monochrome',
	'espresso',
	'zenburn',
	'haddock',
	'tango'
]

app.use(function(req, res, next) {
	var options = req.body.options || {},
		metadata = req.body.metadata || {},
		params = [],
		inputFormat = 'json',
		outputFormat = req.body.format
	outputFormat = outputFormats.indexOf(outputFormat) !== -1 ? outputFormat : 'pdf'

	params.push('--latex-engine=xelatex')
	params.push('--webtex=http://chart.apis.google.com/chart?cht=tx\&chf=bg,s,FFFFFF00\&chco=000000\&chl=')
	options.toc && params.push('--toc')
	options.tocDepth = parseInt(options.tocDepth, 10)
	!isNaN(options.tocDepth) && params.push('--toc-depth', options.tocDepth)
	options.highlightStyle = highlightStyles.indexOf(options.highlightStyle) !== -1 ? options.highlightStyle : 'kate'
	params.push('--highlight-style', options.highlightStyle)
	Object.keys(metadata).forEach(function(key) {
		params.push('-M', key + '=' + metadata[key].toString())
	})

	tmp.file({
		postfix: '.' + outputFormat
	}, function(err, path, fd, cleanupCallback) {
		if (err) {
			return next(err)
		}

		var pandocError = ''

		function onError(err) {
			cleanupCallback()
			next(err)
		}

		function onPandocError() {
			res.statusCode = 400
			cleanupCallback()
			pandocError = pandocError || 'Unknown error'
			console.error(pandocError)
			res.end(pandocError)
		}

		function onTimeout() {
			res.statusCode = 408
			cleanupCallback()
			res.end('Request timeout')
		}

		var binPath = process.env.PANDOC_PATH || '/root/.cabal/bin/pandoc'
		outputFormat = outputFormat === 'pdf' ? 'latex' : outputFormat
		params.push('-f', inputFormat, '-t', outputFormat, '-o', path)
		var pandoc = spawn(binPath, params, {
			stdio: [
				'pipe',
				'ignore',
				'pipe'
			]
		})
		var timeoutId = setTimeout(function() {
			timeoutId = undefined
			pandoc.kill()
		}, timeout)
		pandoc.on('error', onError)
		pandoc.stdin.on('error', onError)
		pandoc.stderr.on('data', function(data) {
			pandocError += data.toString()
		})
		pandoc.on('close', function(code) {
			if (!timeoutId) {
				return onTimeout()
			}
			clearTimeout(timeoutId)
			if (code) {
				return onPandocError()
			}
			var readStream = fs.createReadStream(path)
			readStream.on('open', function() {
				readStream.pipe(res)
			})
			readStream.on('close', function() {
				cleanupCallback()
			})
			readStream.on('error', onPandocError)
		})
		pandoc.stdin.end(req.body.ast)
	})
})

if (process.env.USE_CLUSTER && cluster.isMaster) {
	var count = require('os').cpus().length
	for (var i = 0; i < count; i++) {
		cluster.fork()
	}
	cluster.on('exit', function() {
		console.log('Worker died. Spawning a new process...')
		cluster.fork()
	})
} else {
	var port = 3000
	app.listen(port, function() {
		console.log('HTTP server started: http://localhost:' + port)
	})
}
