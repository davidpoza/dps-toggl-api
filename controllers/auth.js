"use strict";

const validate = require("jsonschema").validate;
const bcrypt   = require("bcrypt");
const passport = require("passport");
const jwt      = require("jsonwebtoken");
/*  */
const User          = require("../models/user");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");
const logger        = require("../utils/logger");


let controller = {
    /*
    Podríamos haber realizado el registro pasando por el middleware de passport, pero no es necesario,
    en este caso se realiza contra una base de datos asi que es muy sencillo hacerlo nosotros.
    */
    register: (req, res, next) => {
        logger.log({message:"intento de registro de usuario", level:"info", req });

        User.findOne({ email: req.body.email.toLowerCase() })
            .then(data => { //si la consulta se ejecuta
                if (data) { //si el usuario existe
                    throw new error_types.InfoError("user already exists");
                }
                else { //si no existe el usuario se crea/registra
                    logger.log({message:"Usuario registrado", level:"info", req });
                    let validation = validate(req.body, valid_schemas.register_user);
                    if(!validation.valid)
                        throw validation.errors;

                    var hash = bcrypt.hashSync(req.body.password, parseInt(process.env.BCRYPT_ROUNDS));
                    let document = new User({
                        email: req.body.email.toLowerCase(),
                        first_name: req.body.first_name || "",
                        last_name: req.body.last_name || "",
                        password: hash,
                        admin: false,
                        active: false,
                        current_task_start_hour: null,
                        current_task_date: null,
                        current_task_desc: null
                    });
                    return document.save();
                }
            })
            .then(data => { //usuario registrado con exito, pasamos al siguiente manejador
                res.json({ data: data });
            })
            .catch(err => { //error en registro, lo pasamos al manejador de errores
                next(err);
            });
    },
    login: (req, res, next) => {
        logger.log({message:"Intento de login", level:"info", req });

        passport.authenticate("local", { session: false }, (error, user) => {
            //console.log("ejecutando *callback auth* de authenticate para estrategia local");

            //si hubo un error en el callback verify relacionado con la consulta de datos de usuario
            if (error) {
                next(new error_types.Error404(error.message));
            }else {
                //console.log("*** comienza generacion token*****");
                const payload = {
                    sub: user._id,
                    exp: Date.now() + parseInt(process.env.JWT_LIFETIME),
                    email: user.email
                };

                /* NOTA: Si estuviesemos usando sesiones, al usar un callback personalizado,
                es nuestra responsabilidad crear la sesión.
                Por lo que deberiamos llamar a req.logIn(user, (error)=>{}) aquí*/

                /*solo inficamos el payload ya que el header ya lo crea la lib jsonwebtoken internamente
                para el calculo de la firma y así obtener el token*/
                jwt.sign(JSON.stringify(payload), process.env.JWT_SECRET, {algorithm: process.env.JWT_ALGORITHM}, (err, token)=>{
                    if(err) return next(err);
                    else res.json({ data: { token: token } });
                });

            }

        })(req, res);
    },
    refresh: (req, res, next) => {
        logger.log({message:"refresh de jwt", level:"info", req });
        const payload = {
            sub: req.user._id,
            exp: Date.now() + parseInt(process.env.JWT_LIFETIME),
            email: req.user.email
        };
        jwt.sign(JSON.stringify(payload), process.env.JWT_SECRET, {algorithm: process.env.JWT_ALGORITHM}, (err, token)=>{
            if(err) return next(err);
            else res.json({ data: { token: token } });
        });
    }


};

module.exports = controller;