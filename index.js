"use strict";
require("dotenv").config();
const mongoogse = require("mongoose");

const app       = require("./app");
const logger = require("./utils/logger");
const port      = process.env.port;

mongoogse.Promise = global.Promise;
mongoogse.connect(process.env.MONGO_URI, { useNewUrlParser: true, useCreateIndex: true, useFindAndModify:false })

    .then(() => {
        console.log("Conexión con exito");
        logger.log({message:"Conexión con mongodb exitosa", level:"info" });
        app.listen(port, () => {
            console.log("Servidor corriendo correctamente en la url: localhost:"+port);
            logger.log({message: "Servidor corriendo correctamente en la url: localhost:"+port, level:"info" });
        });
    })
    .catch(err => console.log(err));