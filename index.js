"use strict";
require("dotenv").config();
const mongoogse = require("mongoose");

const app       = require("./app");
const logger = require("./utils/logger");
const port      = process.env.PORT;

mongoogse.Promise = global.Promise;
mongoogse.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify:false })
    .then(() => {
        console.log("Success on mongoose connection");
        logger.log({message:"Success on mongoose connection", level:"info" });
        app.listen(port, () => {
            console.log("Server running on: localhost:"+port);
            logger.log({message: "Server running on: localhost:"+port, level:"info" });
        });
    })
    .catch(err => console.log(err));

process.on("SIGINT", function(){
    mongoose.connection.close(function(){
        console.log("Mongoose connection closed due to server exit");
        logger.log({message:"Mongoose connection closed due to server exit", level:"info" });
        process.exit(0);
    });
});

process.on("uncaughtException", function(){
    mongoose.connection.close(function(){
        console.log("Mongoose connection closed due to server error");
        logger.log({message:"Mongoose connection closed due to server error", level:"error" });
        console.log("Server error. Uncaught Exception. Closing");
        logger.log({message:"Server error. Uncaught Exception. Closing", level:"error" });
        process.exit(0);
    });
});