"use strict";

const Task        = require("../models/task");
const error_types = require("./error_types");

let controller = {
    createTask: (req, res, next) => {
        if(!req.body.desc || !req.body.date || !req.body.start_hour || !req.body.end_hour)
            next(new error_types.Error400("desc, date, start_hour and end_hour fields are required."));
        let document = Task({
            desc: req.body.desc,
            date: req.body.date,
            start_hour: req.body.start_hour,
            end_hour: req.body.end_hour,
            tags: req.body.tags || [],
            project: req.body.project || null,
            user: req.user._id
        });
        document.save()
            .then((data)=>{
                res.json(data);
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;