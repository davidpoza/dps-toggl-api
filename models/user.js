"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const UserSchema = Schema({
    email     : {type: String, required: true},
    password  : {type: String, required: true},
    first_name: String,
    last_name : String,
    admin     : Boolean,
    avatar    : String,
    active    : Boolean,
    created_on: Date,
    updated_on: Date,
    current_task_start_hour: String, //format HH:MM:SS to keep timer "running" when we close the browser,
    current_task_desc: String,
    current_task_date: Date
});

UserSchema.pre("save", function(next){
    this.created_on = new Date();
    return next();
});

module.exports = mongoose.model("User", UserSchema, "users");