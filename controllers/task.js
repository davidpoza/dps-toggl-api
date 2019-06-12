"use strict";

const Task        = require("../models/task");
const Tag         = require("../models/tag");
const error_types = require("./error_types");

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

    /**
     * only can be updated the owned tasks. Unless you are admin and can modify any task.
     * First of all we check that new tags aren't already assigned to the task.
     * In case of adding or deleting tags, we check that these exist.
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
        if(!req.params.id)
            next(new error_types.Error400("id param with task id is rquired."));
        if(req.body.add_tags && req.body.delete_tags)
            next(new error_types.Error400("It's not possible adding and deleting tags in the same request."));
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
                        throw(new error_types.Error400("Some tag you are trying to add is already a assigned."));
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
    /**
     * only can be fetched the owned tasks. Unless you are admin and can fetch any task.
     * The user, tags and project fields are populated. But user field projection removes
     * the password and admin fields.
     * Parameters via query:
     * -date: "2019-06-10"
     * -user_id: ObjectId (Only for admins)     *
     */
    getTasks: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false)
            filter["user"] = req.user._id;
        else if(req.query.user_id)
            filter["user"] = req.query.user_id;

        if(req.query.date)
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
};

module.exports = controller;