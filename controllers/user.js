"use strict";

const User        = require("../models/user");
const error_types = require("./error_types");

let controller = {
    //return all users except current one
    getUsers: (req, res, next)=>{
        User.findOne({})
            .then(data=>{res.json(data);});

    }
};

module.exports = controller;