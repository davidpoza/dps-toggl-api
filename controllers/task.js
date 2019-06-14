"use strict";

const validate = require("jsonschema").validate;
const mongoose = require("mongoose");

const Task          = require("../models/task");
const Tag           = require("../models/tag");
const error_types   = require("./error_types");
const valid_schemas = require("./valid_schemas");

let controller = {
    /**
     * Parameters via body:
     *  -desc: String
     *  -date: String
     *  -start_hour: String
     *  -end_hour: String
     *  -tags: [ObjectId]
     *  -project: ObjectId
     */
    createTask: (req, res, next) => {
        let validation = validate(req.body, valid_schemas.create_task);
        if(!validation.valid)
            throw validation.errors;

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

    /**
     * The only users allowed to delete a task are admins and the task owner user
     *
     * Parameters via params:
     *  -id (task id)
     *
     * Parameters via body:
     *  -desc: String
     *  -date: String
     *  -start_hour: String
     *  -end_hour: String
     *  -tags: [ObjectId]
     *  -project: ObjectId
     */
    deleteTask: (req, res, next) => {
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

    /**
     * only can be updated the owned tasks. Unless you are admin and can modify any task.
     * First of all we check that new tags aren't already assigned to the task.
     * In case of adding or deleting tags, we check that these exist.
     *
     * Parameters via params
     *  -id (task id)
     *
     * Parameters via body:
     *  -desc: String
     *  -date: String
     *  -start_hour: String
     *  -end_hour: String
     *  -project: ObjectId,
     *  -add_tags: [Objectid, ObjectId, ...]
     *  -delete_tags: [Objectid, ObjectId, ...]
     */
    updateTask: (req, res, next) => {
        if(req.body.add_tags && req.body.delete_tags)
            next(new error_types.Error400("It's not possible adding and deleting tags in the same request."));

        let validation = validate(req.body, valid_schemas.update_task);
        if(!validation.valid)
            throw validation.errors;

        let update = {};
        if(req.body.desc) update["desc"] = req.body.desc;
        if(req.body.date) update["date"] = req.body.date;
        if(req.body.start_hour) update["start_hour"] = req.body.start_hour;
        if(req.body.end_hour) update["end_hour"] = req.body.end_hour;
        if(req.body.project) update["project"] = req.body.project;
        if(req.body.add_tags) update["$push"] = { "tags": { "$each" : req.body.add_tags } };
        if(req.body.delete_tags) update["$pullAll"] = { "tags": req.body.delete_tags };
        Task.findById(req.params.id).lean().exec()
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Task not found"));
                else if (!data.user.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to modify this task"));
                }
                else if(req.body.add_tags){
                    data.tags = data.tags.map(e=>{
                        e = e.toString();
                        return e;
                    });
                    /*we make intersection between new tags and existing tags, it must be void.
                    Otherwise it means a new tag is already a assigned to the task*/
                    if(data.tags.filter(e => req.body.add_tags.includes(e)).length != 0)
                        throw(new error_types.Error400("Some tag you are trying to add is already assigned."));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                if(req.body.add_tags){
                    return Tag.countDocuments({_id: {"$in": req.body.add_tags}})
                        .then(count=>{
                            if(count != req.body.add_tags.length)
                                throw new error_types.Error400("You are trying to add tags that do not exist.");
                        });
                }
                if(req.body.delete_tags){
                    return Tag.countDocuments({_id: {"$in": req.body.delete_tags}})
                        .then(count=>{
                            if(count != req.body.delete_tags.length)
                                throw new error_types.Error400("You are trying to delete tags that do not exist.");
                        });
                }
                return Promise.resolve();
            })
            .then(()=>{ //buscamos todas entidades de los tag que estamos añadiendo
                if (req.body.add_tags)
                    return Tag.find({_id: { $in: req.body.add_tags}});
                return Promise.resolve();
            })
            .then((data)=>{ //añadimos las referencias a task en los tags correspondientes
                if(req.body.add_tags)
                    return Tag.updateMany({_id: {"$in": data}}, {
                        "$push" : { "tasks": req.params.id }
                    });
                return Promise.resolve();
            })
            .then(()=>{ //buscamos todas entidades de los tag que estamos borrando
                if (req.body.delete_tags)
                    return Tag.find({_id: { $in: req.body.delete_tags}});
                return Promise.resolve();
            })
            .then((data)=>{ //borramos las referencias a task en los tags correspondientes
                if(req.body.delete_tags)
                    return Tag.updateMany({_id: {"$in": data}}, {
                        "$pull" : { "tasks": req.params.id }
                    });
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

    getTask: (req, res, next) => {
        let filter = {};
        filter["_id"] = req.params.id;
        if(req.user.admin == false)
            filter["user"] = req.user._id;
        Task.find(filter)
            .then(data=>{
                if(data)
                    res.json(data);
                else
                    throw new error_types.Error404("Task not found or insufficient permissions.");
            })
            .catch(err=>next(err));
    },

    /**
     * only can be fetched the owned tasks. Unless you are admin and can fetch any task.
     * The user, tags and project fields are populated. But user field projection removes
     * the password and admin fields.
     *
     * Parameters via query:
     * -date: "2019-06-10" (if date is not specified then fetchs all tasks grouped by dates)
     * -user_id: ObjectId (Only for admins)
     *
     */
    getTasks: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false)
            filter["user"] = req.user._id;
        else if(req.query.user_id)
            filter["user"] = mongoose.Types.ObjectId(req.query.user_id);

        if(req.query.date){
            filter["date"] = req.query.date;
            Task.find(filter).populate({path:"user", select: "-password -admin"}).populate("tags").populate("project").exec()
                .then(data=>{
                    if(data)
                        res.json(data);
                    else
                        throw new error_types.Error404("There are no tasks");
                })
                .catch(err=>next(err));
        }
        else{
            Task.aggregate([
                {
                    "$match": filter
                },
                {
                    "$lookup": {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                {
                    "$project": {
                        _id: "$_id",
                        date: "$date",
                        desc: "$desc",
                        start_hour: "$start_hour",
                        end_hour: "$end_hour",
                        project: "$project",
                        tags: "$tags",
                        user: { "$arrayElemAt": [ "$user", 0 ] },
                    }
                },
                {
                    "$group": {
                        _id: { date: "$date" },
                        task_count: {
                            $sum: 1
                        },
                        tasks: { $push:  {
                            _id: "$_id",
                            desc: "$desc",
                            start_hour: "$start_hour",
                            end_hour: "$end_hour",
                            user: {
                                _id: "$user._id",
                                email:"$user.email",
                                first_name: "$user.first_name",
                                last_name: "$user.last_name",
                            },
                            project: "$project",
                            tags: "$tags"

                        } }
                    }
                },
                {
                    "$project": {
                        _id: 0,
                        date: "$_id.date",
                        tasks: "$tasks",
                        task_count: 1
                    }
                }
            ])
                .then(data=>{
                    if(data)
                        res.json(data);
                    else
                        throw new error_types.Error404("There are no tasks");
                })
                .catch(err=>next(err));
        }
    }
};

module.exports = controller;