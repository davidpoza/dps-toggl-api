const winston        = require("winston");
const utils         = require("../controllers/utils");
require("winston-daily-rotate-file");

const logger = winston.createLogger({
    transports: [
        new (winston.transports.DailyRotateFile)({
            filename: "logs/%DATE%.log",
            datePattern: "YYYY-MM-DD-HH",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d"
        })
    ],
    format: winston.format.combine(
        winston.format.timestamp({
            format: "DD-MM-YYYY HH:mm:ss"
        }),
        winston.format.printf(info => {
            let ret = {};
            ret.message = info.message || "";
            ret.ip = info.req? utils.getIp(info.req) : "";
            ret.timestamp = info.timestamp || "";
            ret.status = info.status || "";
            ret.level = info.level || "";
            ret.method = info.req? info.req.method : "";

            return (`[${ret.timestamp}] ${ret.ip} ${ret.level} ${ret.method}:${ret.status} - ${ret.message}`);
        })
    ),
    level: process.env.LOG_LEVEL || "info",
    exitOnError: false
});

module.exports = logger;