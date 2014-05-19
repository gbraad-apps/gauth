'use strict';

// get port from environment settings for deployment on Heroku
var EXPRESS_PORT = process.env.PORT || 4000;
var EXPRESS_ROOT = __dirname;
var LIVERELOAD_PORT = 35729;
 
var gulp = require('gulp');
var gutil = require('gulp-util');
var log = gutil.log;

var jshint = require('gulp-jshint');

var zip = require('gulp-zip');

var mocha = require('gulp-mocha');

var codeFiles = ['js/**/*.js', '!test/**/*.js', '!node_modules/**'];
var testFiles = ['test/**/*.js'];

gulp.task('lint', function(){
  log('Linting Files');
  gulp.src(codeFiles)
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});

gulp.task('test', function(){
  log('Running mocha tests');
  gulp.src(testFiles)
    .pipe(mocha({reporter: 'spec'}));
});

gulp.task('watch', function(){
  log('Watching Files');
  gulp.watch(codeFiles, ['lint']);
});

function startExpress(root, port) {
  var express = require('express');
  var app = express();
  app.use(require('connect-livereload')());
  app.use(express.static(root));
  app.listen(port, function() {
    log('Listening on port:', port);
  });
}

var lr;
function startLivereload(port) {
  lr = require('tiny-lr')();
  lr.listen(port);
}
 
function notifyLivereload(event) {
  gulp.src(event.path, {read: false})
      .pipe(require('gulp-livereload')(lr));
}

gulp.task('server', function () {
  startExpress(EXPRESS_ROOT, EXPRESS_PORT);
  startLivereload(LIVERELOAD_PORT);
  gulp.watch(['*.html', 'js/**/*.js'], notifyLivereload);
});

gulp.task('makepkg', function () {
  return gulp.src(['**', '!node_modules/**', '!gauth.zip',
      '!gulpfile.js', '!package.json', '!README.md']).
    pipe(zip('gauth.zip')).
    pipe(gulp.dest('.'));
});

gulp.task('default', ['lint', 'test']);
