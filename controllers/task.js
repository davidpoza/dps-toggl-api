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
    },
    // the only users allowed to delete a task are admins and the task owner user
    deleteTask: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with task id is rquired."));

        Task.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Task not found"));
                else if (!data.user.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to delete this task"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                return Task.deleteOne({ _id: req.params.id });
            })
            .then(()=>{
                res.json({data: {message:"Task deleted succesfully."}});
            })
            .catch(err=>next(err));
    },

    updateTask: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with task id is rquired."));
        let update = {};
        if(req.body.desc) update["desc"] = req.body.desc;
        if(req.body.date) update["date"] = req.body.date;
        if(req.body.start_hour) update["start_hour"] = req.body.start_hour;
        if(req.body.end_hour) update["end_hour"] = req.body.end_hour;
        if(req.body.project) update["project"] = req.body.project;
        if(req.body.tags) update["tags"] = req.body.tags;

        Task.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Task not found"));
                else if (!data.user.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to modify this task"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                return Task.findByIdAndUpdate(req.params.id, update, {new:true});
            })
            .then((data)=>{
                res.json({data: data});
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;