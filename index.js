"use strict";
require("dotenv").config();
const mongoogse = require("mongoose");
const app       = require("./app");
const port      = process.env.port;

mongoogse.Promise = global.Promise;
mongoogse.connect(process.env.MONGO_URI, { useNewUrlParser: true })

    .then(() => {
        console.log("Conexión con exito");

        app.listen(port, () => {
            console.log("Servidor corriendo correctamente en la url: localhost:"+port);
        });
    })
    .catch(err => console.log(err));