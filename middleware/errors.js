const error_types       = require("../controllers/error_types");
let error_middlewares = {

    /*
    Este middleware va al final de todos los middleware y rutas.
    middleware de manejo de errores.
    */
    errorHandler: (error, req, res, next) => {
        if(error instanceof error_types.InfoError)
            res.status(200).json({error: {message:error.message}});
        else if(error instanceof error_types.Error404)
            res.status(404).json({error: {message:error.message}});
        else if(error instanceof error_types.Error403)
            res.status(403).json({error: {message:error.message}});
        else if(error instanceof error_types.Error401)
            res.status(401).json({error: {message:error.message}});
        else if(error instanceof error_types.Error400)
            res.status(400).json({error: {message:error.message}});
        else if(error.name == "ValidationError") //de mongoose
            res.status(200).json({error: {message:error.message}});
        else if(error.message)
            res.status(500).json({error: {message:error.message}});
        else
            next();
    },

    /*
    Este middleware va al final de todos los middleware y rutas.
    middleware para manejar notFound
    */
    notFoundHandler: (req, res) => {
        res.status(404).json({error: {message:"endpoint not found"}});
    }
};


module.exports = error_middlewares;