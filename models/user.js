"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const UserSchema = Schema({
    email   : {type: String, required: true},
    password: {type: String, required: true},
    first_name: String,
    last_name: String,
    admin: Boolean,
});

module.exports = mongoose.model("User", UserSchema, "users");