"use strict";

const validate = require("jsonschema").validate;
const mongoose = require("mongoose");

const Task          = require("../models/task");
const Tag           = require("../models/tag");
const Project       = require("../models/project");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");
const utils         = require("../utils/utils");

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
                res.json({data:data});
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

    /* Function to keep consistency on relationshipo project:tasks (1:n)
    *  It adds the updated task to the new project tasks array.
    *  And it removes from the old project tasks array.
    *  - case 1: new_project == undefined: the task project is not modified.
    *  - case 2: old_project != null y new_project != null: the task has been changed from
    *            an old project to a new project
    *  - case 3: old_project == null and new_project != null: the task didn't have any project assigned
    *            and now we assigned one to it.
    *  - case 4: old_project != null and new_project == null: we remove the project of the task
    */
    keepProjectConsistency: (task_id, old_project, new_project)=>{
        return new Promise((resolve, reject) => {
            if(new_project == undefined)
                resolve(); // si no modificamos el campo project, continuamos

            //quitamos tarea del anterior proyecto
            let update_remove_from_project = {};
            if(old_project != null)
                update_remove_from_project["$pull"] = { "tasks": task_id };
            let update_add_to_project = {};
            if(new_project != null)
                update_add_to_project["$push"] = { "tasks": task_id };

            let p_remove = old_project != null ? Project.findByIdAndUpdate({_id: old_project}, update_remove_from_project, {new: true}) : Promise.resolve();
            let p_add =  Project.findByIdAndUpdate({_id:new_project}, update_add_to_project, {new: true});

            Promise.all([p_remove,p_add])
                .then(()=>resolve())
                .catch((err)=>reject(err));
        });
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
        if(req.body.project != -1 && req.body.project !== undefined)
            update["project"] = req.body.project;
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
                    return Promise.resolve(data);
            })
            .then((data)=>{
                return controller.keepProjectConsistency(req.params.id, (data && data.project)?data.project._id.toString():null, req.body.project);
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
                return Task.findByIdAndUpdate(req.params.id, update, {new:true})
                    .populate({path: "tags", select: "-__v -tasks -user"});
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
        Task.findOne(filter)
            .populate({path: "tags", select: "-__v -tasks -user"})
            .then(data=>{
                if(data)
                    res.json({data:data});
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
     * -date_start: "2019-06-10" (including the date)
     * -date_end: "2019-06-12" (including the date)
     *
     */
    getTasks: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false)
            filter["user"] = req.user._id;
        else if(req.query.user_id)
            filter["user"] = mongoose.Types.ObjectId(req.query.user_id);

        if(req.query.date_start)
            filter["date"] = { "$gte": new Date(req.query.date_start) };

        if(req.query.date_end)
            filter["date"] = Object.assign(filter["date"]?filter["date"]:{}, { "$lte": new Date(req.query.date_end) });

        if(req.query.date){
            filter["date"] = req.query.date;
            Task.find(filter).populate({path:"user", select: "-password -admin"}).populate({path:"tags", select: "-user -tasks"}).populate("project").exec()
                .then(data=>{
                    if(data)
                        res.json({data:data});
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
                    "$lookup": {
                        from: "tags",
                        localField: "tags",
                        foreignField: "_id",
                        as: "tags"
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
                        tags: {
                            "$map": {
                                "input": "$tags",
                                "as": "tagsm",
                                "in": {
                                    _id: "$$tagsm._id",
                                    name: "$$tagsm.name"
                                }
                            }
                        },
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
                            date: "$date",
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
                        task_count: 1,
                        time: "$time"
                    }
                }
            ])
                .sort("date")
                .then(data=>{
                    if(data){
                        data.map(d=>{
                            d.time = d.tasks.reduce((prev,curr)=>{
                                curr = utils.diffHoursBetHours(curr?curr.start_hour:"00:00:00", curr?curr.end_hour:"00:00:00");
                                return(prev+curr);
                            },0);
                            return d;
                        });
                        res.json({data:data});
                    }
                    else
                        throw new error_types.Error404("There are no tasks");
                })
                .catch(err=>next(err));
        }
    }
};

module.exports = controller;