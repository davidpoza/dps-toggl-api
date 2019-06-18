"use strict";
const passport          = require("passport");
const error_types       = require("./error_types");

let auth_middlewares = {

    /*
    Este middleware va *antes* de las peticiones.
    passport.authenticate de jwt por defecto añade en req.user el objeto que devolvamos desde
    el callback de verificación de la estrategia jwt.
    En nuestro caso hemos personalizado el auth_callback de authenticate y
    aunque también inyectamos ese dato en req.user, aprovechamos y personalizaremos las respuestas
    para que sean tipo json.
    */
    ensureAuthenticated: (req,res,next)=>{
        passport.authenticate("jwt", {session: false}, (err, user, info)=>{
            // console.log("ejecutando *callback auth* de authenticate para estrategia jwt");
            //si hubo un error relacionado con la validez del token (error en su firma, caducado, etc)
            if(info){ return next(new error_types.Error401(info.message)); }

            //si hubo un error en la consulta a la base de datos
            if (err) { return next(err); }

            //si el token está firmado correctamente pero no pertenece a un usuario existente
            if (!user) { return next(new error_types.Error403("You are not allowed to access.")); }

            //inyectamos los datos de usuario en la request
            req.user = user;
            return next();
        })(req, res, next);
    }
};

module.exports = auth_middlewares;