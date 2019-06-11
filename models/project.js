"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const ProjectSchema = Schema({
    name   : {type: String, required: true},
    color  : {type: String, required: true},
    created_on: Date,
    owner  : { type: Schema.ObjectId, ref:"User"},
    members: [{ type: Schema.ObjectId, ref:"User"}],
    tasks  : [{ type: Schema.ObjectId, ref:"Task"}]
});

ProjectSchema.pre("save", (next)=>{
    this.created_on = new Date();
    next();
});

module.exports = mongoose.model("Project", ProjectSchema, "projects");