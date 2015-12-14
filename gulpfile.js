var clgulp = require('clgulp')
var gulp = clgulp(require('gulp'))
var exec = clgulp.exec
var util = clgulp.util

gulp.task('tag', ['default'], function(cb) {
	var version = require('./package').version
	var tag = 'v' + version
	util.log('Tagging as: ' + util.colors.cyan(tag))
	exec([
		'git add package.json',
		'git commit -m "Prepare release"',
		'git tag -a ' + tag + ' -m "Version ' + version + '"',
		'git push origin master --tags',
		'docker push classeur/clpandoc:' + version,
	], cb)
})

gulp.task('start', ['default'], function(cb) {
	var version = require('./package').version
	exec([
		'docker kill clpandoc-container',
	], function() {
		exec([
			'docker rm clpandoc-container',
		], function() {
			exec([
				'docker run -i -p 3000:3000 --name=clpandoc-container classeur/clpandoc:' + version,
			], cb)
		})
	})
})

gulp.task('default', function(cb) {
	var version = require('./package').version
	exec([
		'docker build -t classeur/clpandoc:' + version + ' .',
	], cb)
})
