var fs = require("fs");
var gulp = require("gulp");
var shell = require("gulp-shell");
var replace = require('gulp-replace');
var merge = require('merge-stream');
var browserify = require('browserify');
const tsify = require('tsify');

var OpenFlowFiles = [
    "./OpenFlow/src/public/**/*.html", "./OpenFlow/src/public/**/*.css", "./OpenFlow/src/public/**/*.js", "./OpenFlow/src/public/**/*.json",
    "./OpenFlow/src/public/**/*.ico", "./OpenFlow/src/public/**/*.eot", "./OpenFlow/src/public/**/*.svg", "./OpenFlow/src/public/**/*.ttf",
    "./OpenFlow/src/public/**/*.woff", "./OpenFlow/src/public/**/*.woff2", "./OpenFlow/src/public/**/*.png"];
var NodeREDHTMLFiles = ["./OpenFlowNodeRED/src/nodered/nodes/**/*.html", "./OpenFlowNodeRED/src/nodered/nodes/**/*.png"]


var destination = "./dist/public";
var version = "0.0.1";
if (fs.existsSync("../VERSION")) {
    version = fs.readFileSync("../VERSION", "utf8");
} else if (fs.existsSync("VERSION")) {
    version = fs.readFileSync("VERSION", "utf8");
}
gulp.task("copyfiles1", function () {
    var openflow = gulp.src(OpenFlowFiles).pipe(gulp.dest(destination));
    var nodered = gulp.src(NodeREDHTMLFiles).pipe(gulp.dest("OpenFlowNodeRED/dist/nodered/nodes"));
    var version1 = gulp.src('./VERSION').pipe(gulp.dest("./dist"));
    var version2 = gulp.src('./VERSION').pipe(gulp.dest("OpenFlowNodeRED/dist"));

    var copyspurce = gulp.src('./OpenFlow/src/public/**/*.ts').pipe(gulp.dest(destination + '/OpenFlow/src/public'));
    return merge(openflow, nodered, version1, version2, copyspurce);
});
gulp.task("watch", function () {
    return gulp.watch(NodeREDHTMLFiles.concat(OpenFlowFiles).concat('./VERSION').concat('./OpenFlow/src/public/**/*.ts'), gulp.series("copyfiles1", "browserify"));
});
gulp.task("browserify", function () {
    var bfi = browserify({
        entries: ['./OpenFlow/src/public/app.ts'],
        debug: true,
        basedir: '.'
    })
        .plugin(tsify, { noImplicitAny: false })
        .bundle()
        .pipe(fs.createWriteStream('./dist/public/bundle.js'));
    return bfi;
});

gulp.task("compose", shell.task([
    'echo "delete npmrc and cache"',
    "del OpenFlowNodeRED\\dist\\nodered\\.npmrc",
    'rmdir OpenFlowNodeRED\\dist\\.cache /s /q ',
    'gulp browserify',
    'gulp copyfiles1',
    'echo "compile OpenFlowNodeRED"',
    'cd OpenFlowNodeRED && tsc -p tsconfig.json',
    'echo "compile OpenFlow"',
    'tsc -p OpenFlow/tsconfig.json',
    'echo "Build cloudhack/openflownodered"',
    'cd OpenFlowNodeRED && docker build -t cloudhack/openflownodered:edge .',
    'docker tag cloudhack/openflownodered:edge cloudhack/openflownodered:' + version,
    'echo "Push cloudhack/openflownodered"',
    'docker push cloudhack/openflownodered:edge',       //'docker push cloudhack/openflownodered:' + version,
    'docker push cloudhack/openflownodered:' + version,       //'docker push cloudhack/openflownodered:' + version,
    'echo "Build cloudhack/openflow"',
    'docker build -t cloudhack/openflow:edge .',
    'docker tag cloudhack/openflow:edge cloudhack/openflow:' + version,
    'echo "Push cloudhack/openflow"',
    'docker push cloudhack/openflow:edge',
    'docker push cloudhack/openflow:' + version
]));

// gulp.task("build", shell.task([
//     'gulp copyfiles1',
//     'echo "compile OpenFlowNodeRED"',
//     'cd OpenFlowNodeRED && tsc -p tsconfig.json',
//     'echo "compile OpenFlow"',
//     'npx webpack',
//     'tsc -p OpenFlow/tsconfig.json'
// ]));

// gulp.task("pushopenflow", shell.task([
//     'gulp copyfiles1',
//     'echo "compile OpenFlowNodeRED"',
//     'cd OpenFlowNodeRED && tsc -p tsconfig.json',
//     'echo "compile OpenFlow"',
//     'npx webpack',
//     'tsc -p OpenFlow/tsconfig.json'
// ]));

gulp.task("bumpflow", function () {
    console.log('cloudhack/openflow:' + version);
    return gulp.src(["config/**/controllers.yml"])
        .pipe(replace(/openflow:\d+(\.\d+)+/g, 'openflow:' + version))
        .pipe(gulp.dest("config"));
});
gulp.task("bumpnodered", function () {
    console.log('cloudhack/openflownodered:' + version);
    return gulp.src(["config/**/controllers.yml"])
        .pipe(replace(/openflownodered:\d+(\.\d+)+/g, 'openflownodered:' + version))
        .pipe(gulp.dest("config"));
});
gulp.task("bumpconfigmap", function () {
    console.log('cloudhack/openflownodered:' + version);
    return gulp.src(["config/**/configmap.yml"])
        .pipe(replace(/openflownodered:\d+(\.\d+)+/g, 'openflownodered:' + version))
        .pipe(gulp.dest("config"));
});

gulp.task("bumpaiotfrontend", function () {
    var version = "0.0.1";
    version = fs.readFileSync("../aiot-frontend/VERSION", "utf8");
    console.log('cloudhack/aiot-frontend:' + version);
    return gulp.src(["config/**/controllers.yml"])
        .pipe(replace(/aiot-frontend:\d+(\.\d+)+/g, 'aiot-frontend:' + version))
        .pipe(gulp.dest("config"));
});
gulp.task("bumpprojectfiles", function () {
    var data = require("./package.json");
    console.log(data.version + " updated to " + version);
    data.version = version;
    var json = JSON.stringify(data, null, 2);
    fs.writeFileSync("package.json", json);

    data = require("./OpenFlowNodeRED/package.json");
    console.log(data.version + " updated to " + version);
    data.version = version;
    json = JSON.stringify(data, null, 2);
    fs.writeFileSync("OpenFlowNodeRED/package.json", json);
    return gulp.src('.');

});

gulp.task("bump", gulp.series("bumpflow", "bumpnodered", "bumpconfigmap", "bumpaiotfrontend", "bumpprojectfiles"));

gulp.task("default", gulp.series("copyfiles1", "browserify", "watch"));