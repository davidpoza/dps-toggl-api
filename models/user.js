"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const utils       = require("../controllers/utils");

const UserSchema = Schema({
    email     : {type: String, required: true, validate: [utils.validEmail, "Please fill a valid email address"],},
    password  : {type: String, required: true},
    first_name: String,
    last_name : String,
    admin     : Boolean,
});

module.exports = mongoose.model("User", UserSchema, "users");