"use strict";

const validate = require("jsonschema").validate;

const Tag           = require("../models/tag");
const Task          = require("../models/task");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");

let controller = {
    /**
     * Parameters via body:
     *  -name: String
     */
    createTag: (req, res, next) => {
        let validation = validate(req.body, valid_schemas.create_tag);
        if(!validation.valid)
            throw validation.errors;

        let document = Tag({
            name: req.body.name,
            user : req.user._id
        });
        document.save()
            .then((data)=>{
                res.json({data:data});
            })
            .catch(err=>next(err));
    },

    /**
     * The only users allowed to delete a tag are admins and the tag owner user.
     * When delete a tag, tags array from all affected tasks are updated
     *
     * Parameters via params
     *  - id (tag id)
     */
    deleteTag: (req, res, next) => {
        Tag.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Tag not found"));
                else if (!data.user.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to delete this tag"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{ //extracts tag from tags array in Task
                return Task.updateMany({ tags: req.params.id },{
                    $pull : { tags: req.params.id}
                });
            })
            .then(()=>{
                return Tag.deleteOne({ _id: req.params.id });
            })
            .then(()=>{
                res.json({data: {message:"Tag deleted succesfully."}});
            })
            .catch(err=>next(err));
    },

    /**
     * only can be fetched the owned tags. Unless you are admin and can fetch any tag
     * Parameters via query:
     *  -user_id: ObjectId     *
     */
    getTags: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false)
            filter["user"] = req.user._id;
        else if(req.query.user_id)
            filter["user"] = req.query.user_id;

        Tag.find(filter, "-user -tasks")
            .then(data=>{
                if(data)
                    res.json({data:data});
                else
                    throw new error_types.Error404("There are no tags");
            })
            .catch(err=>next(err));
    },

    /**
     * The only users allowed to fetch a tag are admins and the tag owner user.
     *
     * Parameters via params
     *  - id (tag id)
     */
    getTagById: (req, res, next) => {
        let filter = {};
        if(req.user.admin == false){
            filter["user"] = req.user._id;
        }
        filter["_id"] = req.params.id;

        Tag.findOne(filter)
            .then(data=>{
                if(data)
                    res.json({data:data});
                else
                    throw new error_types.Error404("There are no tags");
            })
            .catch(err=>next(err));
    },

    /**
     * only can be updated the owned projects. Unless you are admin and can modify any project
     *
     * Parameters via params:
     *  -id (tag id)
     *
     * Parameters via body:
     *  -name: String
     *  -tasks: [ObjectId]     *
     */
    updateTag: (req, res, next) => {
        let update = {};
        if(req.body.name) update["name"] = req.body.name;
        if(req.body.tasks) update["tasks"] = req.body.tasks;

        let validation = validate(req.body, valid_schemas.update_tag);
        if(!validation.valid)
            throw validation.errors;

        Tag.findById(req.params.id)
            .then(data=>{
                if(!data)
                    throw(new error_types.Error404("Tag not found"));
                else if (!data.user.equals(req.user._id) && req.user.admin==false){
                    throw(new error_types.Error403("You are not allowed to modify this tag"));
                }
                else
                    return Promise.resolve();
            })
            .then(()=>{
                return Tag.findByIdAndUpdate(req.params.id, update, {new:true});
            })
            .then((data)=>{
                res.json({data: data});
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;