"use strict";

const mongoose    = require("mongoose");
const Schema      = mongoose.Schema;

const TagSchema = Schema({
    name      : {type: String, required: true},
    user      : { type: Schema.ObjectId, ref:"User", required: true},
    task      : [{ type: Schema.ObjectId, ref:"Task"}]
});

module.exports = mongoose.model("Tag", TagSchema, "tags");