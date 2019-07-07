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
    /* Function to keep consistency on relationshipo project:tasks (1:n)
    *  It adds the updated task to the new project tasks array.
    *  And it removes from the old project tasks array.
    *  Receives a data parameter which it's passed unchanged to not break then chain.
    *  - case 1: new_project == undefined: the task project is not modified.
    *  - case 2: old_project != null y new_project != null: the task has been changed from
    *            an old project to a new project
    *  - case 3: old_project == null and new_project != null: the task didn't have any project assigned
    *            and now we assigned one to it.
    *  - case 4: old_project != null and new_project == null: we remove the project of the task
    */
    keepProjectConsistency: (data, task_id, old_project, new_project)=>{
        return new Promise((resolve, reject) => {
            if(new_project === undefined)
                return resolve(data); // si no modificamos el campo project, continuamos

            //quitamos tarea del anterior proyecto
            let update_remove_from_project = {};
            if(old_project != null)
                update_remove_from_project["$pull"] = { "tasks": task_id };
            let update_add_to_project = {};
            if(new_project != null)
                update_add_to_project["$push"] = { "tasks": task_id };

            let p_remove = old_project != null ? Project.findByIdAndUpdate({_id: old_project}, update_remove_from_project, {new: true}) : Promise.resolve();
            let p_add =  new_project != null ? Project.findByIdAndUpdate({_id:new_project}, update_add_to_project, {new: true}) : Promise.resolve();

            Promise.all([p_remove,p_add])
                .then(()=>resolve(data))
                .catch((err)=>reject(err));
        });
    },

    /* Function to keep consistency on relationshipo tags:tasks (n:n)
    *  It adds the updated task to each tag in add_tags array. (in updateTask is an array of only one element but in createTask is an array of n elements, )
    *  It removes the updated task from each tag in delete_tags array. (normally is an array of only one element, but in deleteTask is an array of n elements)
    *  Receives a data parameter which it's passed unchanged to not break then chain.
    */
    keepTagsConsistency: (data, task_id, add_tags, delete_tags)=>{
        if(add_tags == null && delete_tags == null)
            return Promise.resolve(data);
        return new Promise((resolve, reject) => {
            if(add_tags){
                return Tag.countDocuments({_id: {"$in": add_tags}})
                    .then(count=>{
                        if(count != add_tags.length)
                            throw new error_types.Error400("You are trying to add tags that do not exist.");
                    })
                    .then(()=>{ //buscamos todas entidades de los tag que estamos añadiendo
                        return Tag.find({_id: { "$in": add_tags}});
                    })
                    .then((data)=>{ //añadimos las referencias a task en los tags correspondientes
                        return Tag.updateMany({_id: {"$in": data}}, {
                            "$push" : { "tasks": task_id }
                        });
                    })
                    .then(()=>resolve(data))
                    .catch(err=>reject(err));
            }
            else if(delete_tags){
                return Tag.countDocuments({_id: {"$in": delete_tags}})
                    .then(count=>{
                        if(count != delete_tags.length)
                            throw new error_types.Error400("You are trying to delete tags that do not exist.");
                    })
                    .then(()=>{ //buscamos todas entidades de los tag que estamos borrando
                        return Tag.find({_id: { "$in": delete_tags}});
                    })
                    .then((data)=>{ //borramos las referencias a task en los tags correspondientes
                        return Tag.updateMany({_id: {"$in": data}}, {
                            "$pull" : { "tasks": task_id }
                        });
                    })
                    .then(()=>resolve(data))
                    .catch(err=>reject(err));
            }
        });
    },


    /**
     * Parameters via body:
     *  -desc: String
     *  -date: String
     *  -start_hour: String
     *  -end_hour: String
     *  -tags: [ObjectId]
     *  -project: ObjectId
     *  -hour_value: float
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
            user: req.user._id,
            hour_value: req.body.hour_value || 0
        });


        document.save()
            .then(data=>controller.keepProjectConsistency(data, data._id.toString(), null, data.project ? data.project._id.toString():undefined))
            .then(data=>controller.keepTagsConsistency(data, data._id.toString(), req.body.tags.length>0 ? req.body.tags:undefined, null)) //nunca se van a borran tags porque no tiene sentido
            .then(data=>{
                return    Task.populate(data, {path: "tags", select: "-__v -tasks -user"});
            })
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
                    return Promise.resolve(data);
            })
            .then((data)=>{
                return controller.keepProjectConsistency(data, req.params.id, (data && data.project) ? data.project._id.toString():null, null);
            })
            .then((data)=>{
                return controller.keepTagsConsistency(data, req.params.id, null, (data && data.tags) ? data.tags:null);
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
     *  -project: ObjectId
     *  -hour_value: float
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
        if(req.body.hour_value) update["hour_value"] = req.body.hour_value;
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
                return controller.keepProjectConsistency(data, req.params.id, (data && data.project)?data.project._id.toString():null, req.body.project);
            })
            .then((data)=>{
                return controller.keepTagsConsistency(data, req.params.id, req.body.add_tags, req.body.delete_tags);
            })
            .then(()=>{
                return Task.findByIdAndUpdate(req.params.id, update, {new:true})
                    .populate({path: "tags", select: "-__v -tasks -user"})
                    .populate({path: "user", select: "-__v -active -admin -password"})
                    .populate({path: "project", select: "-__v -members -tasks -owner -created_on"})
                    .lean();
            })
            .then((data)=>{
                data.date = utils.standarizeDate(data.date);
                res.json({data: data});
            })
            .catch(err=>next(err));
    },

    getTask: (req, res, next) => {
        let filter = {};
        let projection = "";

        filter["_id"] = req.params.id;
        if(req.user.admin == false){
            filter["user"] = req.user._id;
            projection = "-__v -tasks -user -hour_value";
        }
        else{
            projection = "-__v -tasks -user";
        }
        Task.findOne(filter)
            .populate({path: "tags", select: projection})
            .populate({path: "user", select: "-__v -active -admin -password"})
            .populate({path: "project", select: "-__v -members -tasks -owner -created_on"})
            .lean()
            .then(data=>{
                if(data){
                    data.date = utils.standarizeDate(data.date);
                    res.json({data:data});
                }
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
     * -user_id: ObjectId (Only for admins). (Special value "all" for get tasks from everyone)
     * -project_id: ObjectId
     * -date_start: "2019-06-10" (including the date)
     * -date_end: "2019-06-12" (including the date)
     *
     */
    getTasks: (req, res, next) => {
        let total_days = 0; // días totales con tareas
        let filter = {};
        let limit;

        filter["user"] = req.user._id; //to limit non admin user to only be able to fetch their own tasks
        if(req.user.admin == true && req.query.user_id){
            if(req.query.user_id == "all")
                delete filter["user"];
            else
                filter["user"] = mongoose.Types.ObjectId(req.query.user_id);

        }

        if(req.query.limit)
            limit = parseInt(req.query.limit);

        if(req.query.project_id && req.query.project_id != -1){
            filter["project"] = mongoose.Types.ObjectId(req.query.project_id);
        }
        else if(req.query.project_id && req.query.project_id == -1)
            filter["project"] = null;

        if(req.query.date_start)
            filter["date"] = { "$gte": new Date(req.query.date_start) };

        if(req.query.date_end)
            filter["date"] = Object.assign(filter["date"]?filter["date"]:{}, { "$lte": new Date(req.query.date_end) });

        if(req.query.date){
            filter["date"] = req.query.date;
            Task.find(filter).populate({path:"user", select: "-password -admin"})
                .populate({path:"tags", select: "-user -tasks"})
                .populate("project")
                .exec()
                .then(data=>{
                    if(data)
                        res.json({data:data});
                    else
                        throw new error_types.Error404("There are no tasks");
                })
                .catch(err=>next(err));
        }

        else{
            //contamos el total de días
            Task.aggregate([
                {
                    "$match": filter
                },
                {
                    "$group": {
                        _id: { date: "$date" }
                    }
                },
                {
                    "$count": "total"
                }
            ])
                .then(data=>{
                    total_days = data.length == 1 ? data[0].total : 0;
                    return Promise.resolve();
                })
                .then(()=>
                    //incluimos la cuenta en el resultado de la consulta
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
                            "$lookup": {
                                from: "projects",
                                localField: "project",
                                foreignField: "_id",
                                as: "project"
                            }
                        },
                        {
                            "$project": {
                                _id: "$_id",
                                date: { $dateToString: {
                                    date: "$date",
                                    format: "%Y-%m-%d",
                                    timezone: "Europe/Madrid",
                                    onNull: null
                                } },
                                desc: "$desc",
                                hour_value: "$hour_value",
                                start_hour: "$start_hour",
                                end_hour: "$end_hour",
                                project: { $ifNull: [ { "$arrayElemAt": [ "$project", 0 ] }, null ] },
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
                                    hour_value: "$hour_value",
                                    date: "$date",
                                    user: {
                                        _id: "$user._id",
                                        email:"$user.email",
                                        first_name: "$user.first_name",
                                        last_name: "$user.last_name",
                                    },
                                    project: {
                                        $cond: { if: { $eq: [ "$project", null ] }, then: null, else: {
                                            _id: "$project._id",
                                            name: "$project.name",
                                            color: "$project.color"
                                        } }
                                    },
                                    tags: "$tags"

                                } }
                            }
                        },
                        {
                            "$project": {
                                _id: 0,
                                date: "$_id.date",
                                tasks: "$tasks",
                                task_count: "$task_count",
                                time: "$time"
                            }
                        }
                    ])
                        .sort("-date")
                        .limit(limit?limit:100000)
                )
                .then(data=>{
                    if(data){
                        let result = {};
                        result["dates"] = data;
                        result["total"] = total_days;
                        result.dates.map(d=>{
                            d.time = d.tasks.reduce((prev,curr)=>{
                                curr = utils.diffHoursBetHours(curr?curr.start_hour:"00:00:00", curr?curr.end_hour:"00:00:00");
                                return(prev+curr);
                            },0);
                            return d;
                        });
                        res.json({data:result});
                    }
                    else
                        throw new error_types.Error404("There are no tasks");
                })
                .catch(err=>next(err));
        }
    }
};

module.exports = controller;