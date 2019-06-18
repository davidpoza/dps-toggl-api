"use strict";

const validate = require("jsonschema").validate;
const bcrypt   = require("bcrypt");
const path     = require("path");
const fs       = require("fs");
const sharp    = require("sharp");

const User          = require("../models/user");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");
const logger        = require("../utils/logger");

let controller = {
    /**
     * return all users except current one
     * removed password and admin(not for admins) fields
     * Parameters via query
     * - include_me: Boolean
     */
    getUsers: (req, res, next)=>{
        if(req.user.admin){
            if(req.query.include_me)
                User.find({}, "-password")
                    .then(data=>res.json(data))
                    .catch(err=>next(err));
            else
                User.find({ _id: { $ne: req.user._id }}, "-password")
                    .then(data=>res.json(data))
                    .catch(err=>next(err));
        }
        else{
            if(req.query.include_me)
                User.find({ }, "-password -admin")
                    .then(data=>{
                        res.json(data);
                    })
                    .catch(err=>next(err));
            else
                User.find({ _id: { $ne: req.user._id }}, "-password -admin")
                    .then(data=>{
                        res.json(data);
                    })
                    .catch(err=>next(err));
        }

    },
    // get user data from logged user
    getMe: (req, res, next) => {
        User.findOne({ _id: req.user._id })
            .then(data=>{res.json(data);})
            .catch(err=>next(err));
    },

    /**
     * fetch user info except password and admin status
     *
     * Parameters via params:
     *  -id (user id)
     */
    getUser: (req, res, next) => {
        User.findOne({ _id: req.params.id }, "-password -admin")
            .then(data=>{res.json(data);})
            .catch(err=>next(err));
    },

    /**
     * It allows modification of user data to the user or any administrator.
     *
     * Parameters via params:
     *  -id (user id)
     *
     * Parameters via body:
     *  -first_name: String
     *  -last_name: String
     *  -password: String
     *  -repeat_password: String
     *  -avatar: File
     */
    updateUser: (req, res, next) => {
        let update = {};
        let old_avatar = "";

        let validation = validate(req.body, valid_schemas.update_user);
        if(!validation.valid)
            throw validation.errors;

        if(req.body.first_name) update["first_name"] = req.body.first_name;
        if(req.body.last_name) update["last_name"] = req.body.last_name;
        if(req.body.current_password && req.body.password && req.body.repeat_password && req.body.password == req.body.repeat_password){
            let new_hash = bcrypt.hashSync(req.body.password, parseInt(process.env.BCRYPT_ROUNDS));
            update["password"] = new_hash;
        }
        else if(req.body.password)
            return next(new error_types.Error403("Password not changed, need to pass repeat_password field."));

        if(req.user._id != req.params.id && req.user.admin==false)
            return next(new error_types.Error403("You are not allowed to update this user."));

        if(req.files && req.files.avatar){
            if(req.files.avatar.length > 1)
                return next(new error_types.Error500("You can only select one image."));
            let fullpath = req.files.avatar.path;
            let filename = path.basename(fullpath);
            let ext = filename.split(".");
            if(ext[1] != "jpg" && ext[1] != "jpeg"){
                return next(new error_types.Error500("Image should be jpg format."));
            }
            update["avatar"] = filename;
            sharp(fullpath)
                .resize(600)
                .toFile(path.join(process.env.UPLOAD_DIR, "resized", filename))
                .catch(()=>next(new error_types.Error500("Error on resize image.")));
        }

        User.findById(req.params.id)
            .then(data=>{
                if(update["avatar"]){
                    old_avatar = data.avatar;
                }
                if(req.body.current_password && !bcrypt.compareSync(req.body.current_password, data.password))
                    throw new error_types.Error403("Current password is incorrect.");
                else
                    return Promise.resolve();
            })
            .then(()=>User.findOneAndUpdate({ _id: req.params.id }, update, {new:true}))
            .then(data=>{
                if(update["avatar"]){
                    //si todo ha ido correctamente borramos el avatar anterior
                    let filepath = path.join(process.env.UPLOAD_DIR, old_avatar);
                    fs.unlink(filepath, (err)=>{
                        if(err)
                            logger.log({message: "error on delete image "+old_avatar, level:"error", req });
                    });
                }
                res.json(data);
            })
            .catch(err=>next(err));
    },

    /**
     * The only admins can delete users
     * When delete a tag, tags array from all affected tasks are updated
     *
     * Parameters via params:
     *  -id (user id)
     **/
    deleteUser: (req, res, next) => {
        if(req.user.admin==false)
            return next(new error_types.Error403("You are not allowed to delete this user"));
        User.findOneAndDelete({ _id: req.params.id })
            .then((data)=>{
                if(data)
                    res.json({data: {message:"User deleted succesfully."}});
                else
                    return next(new error_types.Error400("User not found"));
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;