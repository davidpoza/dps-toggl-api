"use strict";

const Project     = require("../models/project");
const Task        = require("../models/task");
const error_types = require("./error_types");

let controller = {
    createProject: (req, res, next) => {
        if(!req.body.name || !req.body.color)
            next(new error_types.Error400("name and color fields are required."));
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
    }
};

module.exports = controller;