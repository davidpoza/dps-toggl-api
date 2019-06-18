"use strict";

const validate = require("jsonschema").validate;
const bcrypt   = require("bcrypt");
const path     = require("path");
const sharp    = require("sharp");
const fs       = require("fs");

const User          = require("../models/user");
const error_types   = require("../middleware/error_types");
const valid_schemas = require("../utils/valid_schemas");
const logger        = require("../utils/logger");
const utils         = require("../utils/utils");


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
                    .then(data=>res.json({data:data}))
                    .catch(err=>next(err));
            else
                User.find({ _id: { $ne: req.user._id }}, "-password")
                    .then(data=>res.json({data:data}))
                    .catch(err=>next(err));
        }
        else{
            if(req.query.include_me)
                User.find({ }, "-password -admin")
                    .then(data=>{
                        res.json({data:data});
                    })
                    .catch(err=>next(err));
            else
                User.find({ _id: { $ne: req.user._id }}, "-password -admin")
                    .then(data=>{
                        res.json({data:data});
                    })
                    .catch(err=>next(err));
        }

    },
    // get user data from logged user
    getMe: (req, res, next) => {
        User.findOne({ _id: req.user._id })
            .then(data=>{res.json({data:data});})
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
            .then(data=>{res.json({data:data});})
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
            return next(validation.errors);

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

        let imageUpload = new Promise((resolve, reject)=>{
            if(req.files && req.files.avatar){
                if(req.files.avatar.length > 1)
                    reject(new error_types.Error500("You can only select one image."));
                let fullpath = req.files.avatar.path;
                let filename = path.basename(fullpath);
                let destpath = path.join(process.env.UPLOAD_DIR, "resized", filename);

                if(req.files.avatar.type != "image/jpeg"){
                    reject(new error_types.Error500("Image should be jpg format."));
                }
                sharp(fullpath)
                    .resize(600, 600)
                    .toFile(destpath, (err) => {
                        if(err)
                            reject(new error_types.Error500("Error on resize image."));
                        else{
                            update["avatar"] = filename;
                            utils.deleteAllFiles(path.join(process.env.UPLOAD_DIR, "temp"), ()=>{
                                logger.log({message: "error on delete temp images", level:"error", req });
                            });
                            resolve();
                        }
                    });
            }
            else
                resolve();
        });

        imageUpload
            .then(()=>User.findById(req.params.id))
            .then(data=>{
                if(update["avatar"]){
                    old_avatar = data.avatar;
                }
                if(req.body.current_password && !bcrypt.compareSync(req.body.current_password, data.password))
                    throw new error_types.Error403("Current password is incorrect.");
                else
                    return Promise.resolve();
            })
            .then(()=>User.findOneAndUpdate({ _id: req.params.id }, update, {select: "-password", new:true}))
            .then(data=>{
                if(update["avatar"]){
                    //si todo ha ido correctamente borramos el avatar anterior
                    let resizedFilepath = path.join(process.env.UPLOAD_DIR, "resized", old_avatar);
                    utils.deleteFiles([resizedFilepath], ()=>{
                        logger.log({message: "error on delete images "+old_avatar, level:"error", req });
                    });
                }
                res.json({data:data});
            })
            .catch(err=>{
                let fileArray = [];
                if (typeof update["avatar"] === "string"){
                    fileArray.push(path.join(process.env.UPLOAD_DIR, "resized", update["avatar"]));
                }
                let tempFolder = path.join(process.env.UPLOAD_DIR, "temp");
                utils.deleteFiles(fileArray, ()=>{
                    logger.log({message: "error on delete images", level:"error", req });
                });
                utils.deleteAllFiles(tempFolder, ()=>{
                    logger.log({message: "error on delete temp images", level:"error", req });
                });
                next(err);
            });
    },

    /**
     * get image avatar
     *
     * Parameters via params:
     *  -image (filename). If not is provided then try to show the authenticated user avatar
     *
     */
    getAvatarImage: (req, res, next) => {
        if(req.params.image){
            fs.stat(path.join(process.env.UPLOAD_DIR, "resized", req.params.image), (err, stats) => {
                if(err)
                    return res.sendFile(path.resolve(path.join("public", "images", "default_avatar.jpg")));
                else if(stats)
                    return res.sendFile(path.resolve(path.join("uploads", "resized", req.params.image)));
            });
        }
        else
            return next(new error_types.Error404("You must provide and filename or Authorization header"));
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