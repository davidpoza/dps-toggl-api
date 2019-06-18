"use strict";

const validate = require("jsonschema").validate;

const Project       = require("../models/project");
const Task          = require("../models/task");
const User          = require("../models/user");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");

let controller = {
    /**
     * Parameters via body:
     *  -name: String
     *  -color: String
     */
    createProject: (req, res, next) => {
        let validation = validate(req.body, valid_schemas.create_project);
        if(!validation.valid)
            throw validation.errors;

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
     * Parameters via params
     * - id (project id)
     */
    deleteProject: (req, res, next) => {
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
                return Project.deleteOne({ _id: req.params.id });
            })
            .then(()=>{
                res.json({data: {message:"Project deleted succesfully."}});
            })
            .catch(err=>next(err));
    },

    /**
     * Only can be fetched the owned projects or those you are member of. Unless you are admin and can fetch any project
     * Parameters via query:
     *  -user_id: ObjectId (only for admins)
     *
     */
    getProjects: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false){
            filter["$or"] = [{owner:req.user._id}, {members:req.user._id}];
        }
        else if(req.query.user_id)
            filter["owner"] = req.query.user_id;

        Project.find(filter).populate("tasks").exec()
            .then(data=>{
                if(data){
                    //data = data.map(e=>e.transform());
                    res.json(data);
                }
                else
                    throw new error_types.Error404("There are no projects");
            })
            .catch(err=>next(err));
    },

    /**
     * The only users allowed to fetch a project are admins and the project owner user.
     *
     * Parameters via params
     * - id (project id)
     */
    getProjectById: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false){
            filter["$or"] = [{owner:req.user._id}, {members:req.user._id}];
        }
        filter["_id"] = req.params.id;

        Project.findOne(filter).populate("tasks")
            .populate({path: "owner", select: "-password -admin"}).exec()
            .then(data=>{
                if(data)
                    res.json(data);
                else
                    throw new error_types.Error404("There are no projects");
            })
            .catch(err=>next(err));
    },

    /**
     * only can be updated the owned projects. Unless you are admin and can modify any project.
     * First of all we check that new members aren't already project members.
     * In case of adding or deleting members, we check that these exist.
     *
     * Parameters via params
     *  -id (project id)
     *
     * Parameters via body:
     *  -name: String
     *  -color: String
     *  -add_members: [ObjectId, ObjectId, ...]
     *  -delete_members: [ObjectId, ObjectId, ...]     *
     */
    updateProject: (req, res, next) => {
        if(req.body.add_members && req.body.delete_members)
            next(new error_types.Error400("It's not possible adding and deleting members in the same request."));
        let update = {};

        let validation = validate(req.body, valid_schemas.update_project);
        if(!validation.valid)
            throw validation.errors;

        if(req.body.name) update["name"] = req.body.name;
        if(req.body.color) update["color"] = req.body.color;
        if(req.body.add_members) update["$push"] = { "members": { "$each" : req.body.add_members } };
        if(req.body.delete_members) update["$pullAll"] = { "members": req.body.delete_members };
        Project.findById(req.params.id).lean().exec()
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Project not found"));
                else if (!data.owner.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to modify this project."));
                }
                else if(req.body.add_members){
                    data.members = data.members.map(e=>{
                        e = e.toString();
                        return e;
                    });
                    /*we make intersection between new users and existing users, it must be void.
                    Otherwise it means a new member is already a member*/
                    if(data.members.filter(e => req.body.add_members.includes(e)).length != 0)
                        throw(new error_types.Error400("Some user you are trying to add is already a member."));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                if(req.body.add_members){
                    return User.countDocuments({_id: {"$in": req.body.add_members}})
                        .then(count=>{
                            if(count != req.body.add_members.length)
                                throw new error_types.Error400("You are trying to add members that do not exist.");
                        });
                }
                if(req.body.delete_members){
                    return User.countDocuments({_id: {"$in": req.body.delete_members}})
                        .then(count=>{
                            if(count != req.body.delete_members.length)
                                throw new error_types.Error400("You are trying to delete members that do not exist.");
                        });
                }
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