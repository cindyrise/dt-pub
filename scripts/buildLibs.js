
//file handling
const rimraf = require('rimraf');
const join = require('path').join;
const fs = require('fs');
const spawn = require('child_process').spawn;

rimraf('publishLib', () => {
    fs.mkdirSync('publishLib');
    console.log(process.argv,99900);
    let fileNames = ["package.json","README.md"];
    fileNames.forEach(fileName=>{
        let sourceFile = join(__dirname, '../', fileName);
        let destPath = join(__dirname, "../publishLib", fileName);
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(destPath));
    });

    //copy build 文件
    let from = join(__dirname, '../build');
    let to = join(__dirname, '../publishLib');
    spawn('cp', ['-r', from, to]);

});
