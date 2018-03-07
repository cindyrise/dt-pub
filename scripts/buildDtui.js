/* eslint strict: [2, "global"] */

//rollup with plugins
const rollup = require('rollup').rollup;
const babelRollup = require('rollup-plugin-babel');
const cjs = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify');
const replace = require('rollup-plugin-replace');
const resolveNode = require('rollup-plugin-node-resolve');
const sass = require('rollup-plugin-sass');
const progress = require('rollup-plugin-progress');
//file handling
const rimraf = require('rimraf');
const join = require('path').join;
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const curPath = path.resolve('./');
//console utils
const argv = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const showWrite = argv.progress;
const showSection = argv.step || true;
const log = console.log;
const CLI = {
    section: msg => showSection ? log(chalk.white(chalk.underline.bgBlue(msg))) : false,
    write: (indicator, msg) => showWrite ? process.stdout.write(`(${chalk.red(indicator)})` + msg) : false
};
//variables
const Bundles = {
    UMD_DEV: 'UMD_DEV',
    UMD_PROD: 'UMD_PROD',
    IIFE_DEV: 'IIFE_DEV',
    IIFE_PROD: 'IIFE_PROD',
    DEMO_PROD: 'DEMO_PROD',
    DOC_PROD: 'DOC_PROD'
};
let tasks = [];

//attributes for different bundles
function makeBundleAttributes(bundleType) {
    let atrs = {
        path: '',
        env: 'development',
        format: 'iife',
        sourceMap: true,
        plugins: []
    };

    switch (bundleType) {
        case Bundles.UMD_PROD:
            atrs.env = 'production';
            atrs.sourceMap = false;
            atrs.format = 'umd';
            atrs.plugins.push(uglify());
        case Bundles.UMD_DEV:
            atrs.path = './dtui-pub/libs/';
            atrs.format = 'umd';
            break;
        case Bundles.IIFE_PROD:
            atrs.env = 'production';
            atrs.sourceMap = false;
            atrs.plugins.push(uglify());
        case Bundles.IIFE_DEV:
            atrs.path = './dtui-pub/dist/';
            break;
    }

    return atrs;
}

//rollup config generations
function makeConfig(bundleType) {
    let atrs = makeBundleAttributes(bundleType);
    let config = {
        input: `${curPath}/react-dtui/src/index.js`,
        plugins: [
            sass({
                output: atrs.path + 'react-dtui.css'
            }),
            cjs({
                include: 'node_modules/**',
                namedExports: {
                    'node_modules/react/react.js': ['PropTypes', 'Component']
                }
            }),
            babelRollup({
                babelrc: false,
                exclude: 'node_modules/**',
                presets: [['es2015', { modules: false }], 'stage-2', 'react'],
                plugins: ['external-helpers']
            }),
            replace({ 'process.env.NODE_ENV': JSON.stringify(atrs.env) }),
            resolveNode({
                jsnext: true,
                main: true
            }),
        ].concat(atrs.plugins),
        external: ['react', 'react-dom'],
    };

    if (showWrite) {
        config.plugins.push(progress({
            clearLine: false
        }));
    }
    return config;
}

//create a promise task
function createTask(msg, fn) {
    return () => {
        CLI.section(msg);
        return new Promise((res, rej) => fn(res, rej));
    };
}

//run async tasks in sync to avoid output mess
function runTasks($tasks) {
    let index = 0;
    return new Promise((res, rej) => {

        function next() {
            if (index < $tasks.length) {
                $tasks[index]().then(next, rej);
                index++;
            } else {
                res();
            }
        }

        next();
    });
}

function createNodeBuild() {
    return (res, rej) => {
        let count = 0;
        let bat = exec('NODE_ENV=production babel ../react-dtui/src --out-dir ./dtui-pub/libs --copy-files', { stdio: [0, 1, 2] }, (error, stdout, stderr) => {
            if (error) {
                rej(error);
                return;
            }
        });
        bat.stdout.on('data', (data) => {
            CLI.write(count++, data);
        });
        bat.on('exit', (code) => {
            res(code);
        });
    };
}

function createWebpackBuild(config) {
    return (res, rej) => {
        webpack(config, (err, stats) => {
            if (err || stats.hasErrors()) {
                rej('webpack dtui error');
            }
            log(stats.toString({
                chunks: false,  // Makes the dtui much quieter
                colors: true    // Shows colors in the console
            }));
            res();
        });
    };
}

function createBundle(bundleType) {
    let atrs = makeBundleAttributes(bundleType);
    return (res, rej) => {
        rollup(makeConfig(bundleType))
            .then(bundle => {
                CLI.section('Writing Bundle to file');
                return bundle.write({
                    name: 'DTUI',
                    file: atrs.path + (atrs.env === 'production' ? 'react-dtui.min.js' : 'react-dtui.js'),
                    format: atrs.format,
                    sourcemap: atrs.sourceMap,
                    globals: {
                        react: 'React'
                    }
                });
            })
            .then(() => {
                res();
            })
            .catch(err => {
                rej(err);
            });
    };
}
log(chalk.white(chalk.underline.bgBlue('git clone ... ')));

rimraf('react-dtui', () => {
    exec("git clone https://github.com/cindyrise/react-dtui.git", (error, stdout, stderr) => {
        if (error) {
            console.error('error: ' + error);
            return;
        }
        log(chalk.white(chalk.underline.bgBlue('git clone 完成 ')));
        buildPackage();
    });
})


function buildPackage() {
    rimraf('dtui-pub', () => {
        fs.mkdirSync('dtui-pub');
        fs.mkdirSync(join('dtui-pub', 'libs'));
        fs.mkdirSync(join('dtui-pub', 'dist'));
        let from = join(__dirname, '../react-dtui/package.json');
        let to = join(__dirname, '../dtui-pub');
        spawn('cp', ['-r', from, to]);
        log(chalk.white(chalk.underline.bgBlue('开始打包dtui-pub项目')));
        tasks.push(
            //Node individual components dtui
            createTask('Making Babel Modules', createNodeBuild()),
            //createTask('Making UMD Dev Bundles', createBundle(Bundles.UMD_DEV)),
            createTask('Making UMD Production Bundles', createBundle(Bundles.UMD_PROD)),
            //createTask('Making IIFE Dev Bundles', createBundle(Bundles.IIFE_DEV)),
            createTask('Making IIFE Production Bundles', createBundle(Bundles.IIFE_PROD))
        );
        // run tasks
        runTasks(tasks).then(() => {
            log(chalk.white(chalk.underline.bgBlue('打包dtui-pub项目完成')));
            exec("cd dtui && npm publish", (error, stdout, stderr) => {
                if (error) {
                    console.error('error: ' + error);
                    return;
                }
                log(chalk.white(chalk.underline.bgBlue(`恭喜，${stdout}发布至NPM成功。`)));
            });
        }, err => {
            log('Error', err);
        });

    });
}


