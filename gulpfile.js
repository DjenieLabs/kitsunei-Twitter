var gulp = require('gulp'),
    utils = require('gulp-util'),
    jshint = require('gulp-jshint'),
    pump = require('pump');
    uglify = require('gulp-uglify'),
    uglifycss = require('gulp-uglifycss'),
    htmlmin = require('gulp-htmlmin'),
    babel = require('gulp-babel');


var dest = "dist/";

// Check the code quality
gulp.task('qualitychecker', function(cb) {
	return gulp.src([
		'**/*.js',
		'!node_modules/**/*.js',
		'!dist/**/*.js',
		'!Twitter/components/**/*.js'])
		.pipe(jshint({esversion: 6}))
		.pipe(jshint.reporter('default'))
		.on('error', utils.log);
});


gulp.task('js', function (cb) {
  pump([
    gulp.src('Twitter/**/*.js'),
    babel({"presets": ["env"]}),
    uglify(),
    gulp.dest(dest)
    ],
    cb
  );
});


gulp.task('css', function(cb) {
	pump([
		gulp.src('Twitter/**/*.css'),
		uglifycss(),
		gulp.dest(dest)
	], cb);
});


gulp.task('html', function (cb) {
  pump([
    gulp.src('Twitter/**/*.html'),
    htmlmin({collapseWhitespace: true}),
    gulp.dest(dest)
    ],
    cb
  );
});

gulp.task('build', ['js', 'css', 'html']);
gulp.task('default', ['qualitychecker']);
