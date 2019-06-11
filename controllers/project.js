"use strict";

const Project        = require("../models/project");
const error_types = require("./error_types");

let controller = {
    createProject: (req, res, next) => {
        if(!req.body.name || !req.body.color)
            next(new error_types.Error400("desc, date, start_hour and end_hour fields are required."));
        let document = Project({
            name      : req.body.name,
            color     : req.body.color,
            owner     : req.user._id,
            members   : [],
            tasks     : []
        });
        document.save()
            .then((data)=>{
                res.json(data);
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;