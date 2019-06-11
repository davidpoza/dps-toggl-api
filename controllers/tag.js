"use strict";

const Tag         = require("../models/tag");
const Project     = require("../models/project");
const Task        = require("../models/task");
const error_types = require("./error_types");

let controller = {
    createTag: (req, res, next) => {
        if(!req.body.name)
            next(new error_types.Error400("name field is required."));
        let document = Tag({
            name: req.body.name,
            user : req.user._id,
            tasks: []
        });
        document.save()
            .then((data)=>{
                res.json(data);
            })
            .catch(err=>next(err));
    },
    /**
     * The only users allowed to delete a task are admins and the project owner user.
     * When delete a project, all his tasks are set to project=null
     *
     * */
    deleteProject: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with project id is rquired."));

        Project.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Project not found"));
                else if (!data.owner.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to delete this project"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                return Task.updateMany({project: req.params.id},{
                    project: null
                });
            })
            .then(()=>{
                return Task.deleteOne({ _id: req.params.id });
            })
            .then(()=>{
                res.json({data: {message:"Project deleted succesfully."}});
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
    },
    /**
     * only can be fetched the owned projects. Unless you are admin and can fetch any project
     * Parameters via query:
     *  -user_id: ObjectId
     *
     */
    getProjects: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false)
            filter["owner"] = req.user._id;
        else if(req.query.user_id)
            filter["owner"] = req.query.user_id;

        Project.find(filter)
            .then(data=>{
                if(data)
                    res.json(data);
                else
                    throw new error_types.Error404("There are no projects");
            })
            .catch(err=>next(err));
    },

    /**
     * only can be updated the owned projects. Unless you are admin and can modify any project
     * Parameters via body:
     *  -user_id: ObjectId
     *
     */
    updateProject: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with project id is rquired."));
        let update = {};
        if(req.body.name) update["name"] = req.body.name;
        if(req.body.color) update["color"] = req.body.color;

        Project.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Project not found"));
                else if (!data.owner.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to modify this project"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                return Project.findByIdAndUpdate(req.params.id, update, {new:true});
            })
            .then((data)=>{
                res.json({data: data});
            })
            .catch(err=>next(err));
    },
};

module.exports = controller;