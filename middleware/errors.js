const jsonschema = require("jsonschema");

const error_types = require("./error_types");
const logger        = require("../utils/logger");

let error_middlewares = {

    /*
    Este middleware va al final de todos los middleware y rutas.
    middleware de manejo de errores.
    */
    errorHandler: (error, req, res, next) => {

        if (error instanceof error_types.InfoError){
            logger.log({message: error.message, stack: error.stack, level:"error", status:200, req });
            res.status(200).json({ error: { message: error.message } });
        }
        else if (error instanceof error_types.Error404){
            logger.log({message: error.message, stack: error.stack, level:"error", status:404, req });
            res.status(404).json({ error: { message: error.message } });
        }
        else if (error instanceof error_types.Error403){
            logger.log({message: error.message, stack: error.stack, level:"error", status:403, req });
            res.status(403).json({ error: { message: error.message } });
        }
        else if (error instanceof error_types.Error401){
            res.status(401).json({ error: { message: error.message } });
            logger.log({message: error.message, stack: error.stack, level:"error", status:401, req });
        }
        else if (error instanceof error_types.Error400){
            logger.log({message: error.message, stack: error.stack, level:"error", status:400, req });
            res.status(400).json({ error: { message: error.message } });
        }
        else if (error.name == "MongoError" && error.code == 11000)
        {
            logger.log({message: error.message, stack: error.stack, level:"error", status:400, req });
            res.status(400).json({ error: { message: "identifier already exists" } });
        }
        else if (Array.isArray(error) && error[0] instanceof jsonschema.ValidationError) {
            let msg_array = [];
            let msg = "";
            let regex_property_name = /\.?(\w*)(\[\d\])?$/; //get identificator of property
            error.forEach(e => {
                let property = e.property.match(regex_property_name);
                switch(property[1]){
                case "instance":
                    msg = e.message;
                    break;
                case "password":
                    msg = "password should contain at least one digit, one lower case, one upper case, one special character [@!.-_#?=] and length of 8.";
                    break;
                case "email":
                    msg = "email address should be valid.";
                    break;
                case "color":
                    msg = "color should be a valid hex color, e.g. #d3d3d3";
                    break;
                case "project":
                    msg = "project should be an ObjectId";
                    break;
                case "avatar":
                    msg = "avatar must a path";
                    break;
                case "add_tags":
                    msg = "add_tags should be an array of ObjectId";
                    break;
                case "delete_tags":
                    msg = "delete_tags should be an array of ObjectId";
                    break;
                case "add_members":
                    msg = "add_members should be an array of ObjectId";
                    break;
                case "delete_members":
                    msg = "delete_members should be an array of ObjectId";
                    break;
                case "start_hour":
                    msg = "start_hout should match format HH:MM:SS";
                    break;
                case "end_hour":
                    msg = "end_hour should match format HH:MM:SS";
                    break;
                default:
                    msg = property[1] + " " + e.message;
                }
                if(!msg_array.includes(msg)) //not repeat error messages
                    msg_array.push(msg);
            });
            logger.log({message: msg_array.join(" | "), stack: error.stack, level:"error", status:400, req });
            res.status(400).json({ error: { message: msg_array.join(" | ") } });
        }
        else if (error.name == "ValidationError"){
            res.status(200).json({ error: { message: error.message } });
        }
        //ignoramos este error de connect-multiparty al no indicar ningun campo,
        else if (error.message == "stream ended unexpectedly"){
            res.status(200).json({});
        }
        else if (error.message){
            logger.log({message: error.message, stack: error.stack, level:"error", status:500, req });
            res.status(500).json({ error: { message: error.message } });
        }
        else
            next();
    },

    /*
    Este middleware va al final de todos los middleware y rutas.
    middleware para manejar notFound
    */
    notFoundHandler: (req, res) => {
        logger.log({message: "endpoint not found", level:"error", status:404, req });
        res.status(404).json({ error: { message: "endpoint not found" } });
    }
};


module.exports = error_middlewares;