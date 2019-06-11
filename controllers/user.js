"use strict";

const User        = require("../models/user");
const error_types = require("./error_types");

let controller = {
    //return all users except current one
    getUsers: (req, res, next)=>{
        User.find({ _id: { $ne: req.user._id }})
            .then(data=>{res.json(data);})
            .catch(err=>next(err));
    }
};

module.exports = controller;