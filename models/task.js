"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const TaskSchema = Schema({
    desc      : {type: String, required: true},
    date      : {type: Date, required: true},
    start_hour: {type: String, required: true},
    end_hour  : {type: String, required: true},
    user      : { type: Schema.ObjectId, ref:"User", required: true},
    tags      : [{ type: Schema.ObjectId, ref:"Tag"}],
    project   : { type: Schema.ObjectId, ref:"Project"},
});

module.exports = mongoose.model("Task", TaskSchema, "tasks");