"use strict";

const express       = require("express");
const bcrypt        = require("bcrypt");
const bodyParser    = require("body-parser");
const passport      = require("passport");
const JwtStrategy   = require("passport-jwt").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const ExtractJwt    = require("passport-jwt").ExtractJwt;
const cors          = require("cors");
const app           = express();

// cargamos archivo de rutas
const User           = require("./models/user");
const auth_routes    = require("./routes/auth");
const user_routes    = require("./routes/user");
const project_routes = require("./routes/project");
const tag_routes     = require("./routes/tag");
const task_routes    = require("./routes/task");
const errorMdw       = require("./middleware/errors");
//middlewares

passport.use(new LocalStrategy({
    usernameField: "email",
    passwordField: "password",
    session: false
}, (email, password, done)=>{
    // console.log("ejecutando *callback verify* de estategia local");
    User.findOne({email:email})
        .then(data=>{
            if(data === null) return done(null, false); //el usuario no existe
            else if(!bcrypt.compareSync(password, data.password)) { return done(null, false); } //no coincide la password
            return done(null, data); //login ok
        })
        .catch(err=>done(err, null)); // error en DB
}));

/** config de estrategia jwt de passport ******/
let opts = {};
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = process.env.JWT_SECRET;
opts.algorithms = [process.env.JWT_ALGORITHM];

passport.use(new JwtStrategy(opts, (jwt_payload, done)=>{
    // console.log("ejecutando *callback verify* de estategia jwt");
    User.findOne({_id: jwt_payload.sub})
        .then(data=>{
            if (data === null) { //no existe el usuario
            //podríamos registrar el usuario
                return done(null, false);
            }
            /*encontramos el usuario así que procedemos a devolverlo para
        inyectarlo en req.user de la petición en curso*/
            else
                return done(null, data);
        })
        .catch(err=>done(err, null)); //si hay un error lo devolvemos
}));
//para que todo lo que llegue por body lo convierta a un objeto json
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(cors({origin: "*"}));


//rutas
app.use("/api/auth", auth_routes);
app.use("/api", user_routes);
app.use("/api", task_routes);
app.use("/api", project_routes);
app.use("/api", tag_routes);


//error Middleware
app.use(errorMdw.errorHandler);

//404 Not Found Middleware
app.use(errorMdw.notFoundHandler);

module.exports = app;