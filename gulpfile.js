var clgulp = require('clgulp');
var gulp = clgulp(require('gulp'));
var exec = clgulp.exec;
var util = clgulp.util;

gulp.task('tag', function(cb) {
    var version = require('./package').version;
    var tag = 'v' + version;
    util.log('Tagging as: ' + util.colors.cyan(tag));
    exec([
        'git add package.json',
        'git commit -m "Prepare release"',
        'git tag -a ' + tag + ' -m "Version ' + version + '"',
        'git push origin master --tags',
    ], cb);
});

gulp.task('start', ['default'], function(cb) {
    exec([
        'docker kill clpandoc-container',
    ], function() {
        exec([
            'docker rm clpandoc-container',
        ], function() {
            exec([
                'docker run -i -p 3000:3000 --name=clpandoc-container classeur/clpandoc',
            ], cb);
        });
    });
});

gulp.task('default', function(cb) {
    exec([
        'docker build -t classeur/clpandoc .',
    ], cb);
});
