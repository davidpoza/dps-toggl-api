const fs   = require("fs");
const path = require("path");

const utils = {
    validEmail: (email) => {
        let re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
        return re.test(email);
    },

    getIp: (req)=>{
        let ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        return ip;
    },

    // receives an array of paths (strings)
    deleteFiles: (paths, err)=>{
        paths.forEach((f)=>{
            fs.unlink(f, err);
        });
    },

    // removes all files from dir
    deleteAllFiles: (dir)=>{
        fs.readdir(dir, (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join(dir, file), err => {
                    if (err) throw err;
                });
            }
        });
    }
};
module.exports = utils;