"use strict";

const Tag         = require("../models/tag");
const Project     = require("../models/project");
const Task        = require("../models/task");
const error_types = require("./error_types");
const Mongoose    = require("mongoose");

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
     * The only users allowed to delete a tag are admins and the tag owner user.
     * When delete a tag, tags array from all affected tasks are updated
     *
     * */
    deleteTag: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with tag id is rquired."));

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
    }
};

module.exports = controller;