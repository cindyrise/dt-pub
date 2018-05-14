const spawn = require('child_process').spawn;
const join = require('path').join;
const fs = require('fs');
const chalk = require('chalk');
const log = console.log;
const rimraf = require('rimraf');
const exec = require('child_process').exec;

log(chalk.white(chalk.underline.bgBlue('git clone ... ')));
rimraf('generator-dtcli', () => {
    exec("git clone https://github.com/cindyrise/generator-dtcli.git", (error, stdout, stderr) => {
        if (error) {
            console.error('error: ' + error);
            return;
        }
        log(chalk.white(chalk.underline.bgBlue('git clone 完成 ')));
        buildPackage();
    });
})
function buildPackage() {
    rimraf('dtcli-pub', () => {
        fs.mkdirSync('dtcli-pub');
        let from = join(__dirname, '../generator-dtcli/');
        let to = join(__dirname, '../dtcli-pub');
        spawn('cp', ['-r', from, to]);
        log(chalk.white(chalk.underline.bgBlue('开始打包dtcli-pub项目')));
        exec("cd dtcli-pub && npm publish", (error, stdout, stderr) => {
            if (error) {
                console.error('error: ' + error);
                return;
            }
             log(chalk.white(chalk.underline.bgBlue(`恭喜，${stdout}发布至NPM成功。`)));
        });
    });
}


