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
    },

    diffHoursBetHours: (hour_start, hour_end) => {
        let regexHour = /(\d{2}):\d{2}:\d{2}/;
        let regexMin = /\d{2}:(\d{2}):\d{2}/;
        let hour1 = hour_start.match(regexHour)[1];
        let hour2 = hour_end.match(regexHour)[1];
        let min1 = hour_start.match(regexMin)[1];
        let min2 = hour_end.match(regexMin)[1];
        let total_min = parseInt(hour2)*60 - parseInt(hour1)*60 + parseInt(min2) - parseInt(min1);
        return(Math.floor(total_min/60 * 10) / 10); //truncamos a un decimal
    },
};
module.exports = utils;