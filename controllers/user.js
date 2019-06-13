"use strict";

const User        = require("../models/user");
const error_types = require("./error_types");

let controller = {
    // return all users except current one
    // removed password and admin(not for admins) fields
    getUsers: (req, res, next)=>{
        if(req.user.admin)
            User.find({ _id: { $ne: req.user._id }}, "-password")
                .then(data=>res.json(data))
                .catch(err=>next(err));
        else
            User.find({ _id: { $ne: req.user._id }}, "-password -admin")
                .then(data=>{
                    res.json(data);
                })
                .catch(err=>next(err));
    },
    // get user data from logged user
    getMe: (req, res, next) => {
        User.findOne({ _id: req.user._id })
            .then(data=>{res.json(data);})
            .catch(err=>next(err));
    },
    /**
     * It allows modification of user data to the user or any administrator.
     * Parameters via body:
     *  -first_name: String
     *  -last_name: String
     *  -password: String
     *  -repeat_password: String
     */
    updateUser: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with user id is rquired."));
        let update = {};
        if(req.body.first_name) update["first_name"] = req.body.first_name;
        if(req.body.last_name) update["last_name"] = req.body.last_name;
        if(req.body.password && req.body.repeat_password && req.body.password == req.body.repeat_password){
            let hash = bcrypt.hashSync(req.body.password, parseInt(process.env.BCRYPT_ROUNDS));
            update["password"] = hash;
        }
        if(req.body.first_name) update["first_name"] = req.body.first_name;

        if(req.user._id != req.params.id && req.user.admin==false)
            next(new error_types.Error403("You are not allowed to update this user"));
        User.findOneAndUpdate({ _id: req.params.id }, update, {new:true})
            .then(data=>{res.json(data);})
            .catch(err=>next(err));
    },

    /**
     * The only admins can delete users
     * When delete a tag, tags array from all affected tasks are updated
     *
     **/
    deleteUser: (req, res, next) => {
        if(!req.params.id)
            next(new error_types.Error400("id param with user id is rquired."));
        if(req.user.admin==false)
            next(new error_types.Error403("You are not allowed to delete this user"));
        User.findOneAndDelete({ _id: req.params.id })
            .then((data)=>{
                if(data)
                    res.json({data: {message:"User deleted succesfully."}});
                else
                    next(new error_types.Error400("User not found"));
            })
            .catch(err=>next(err));
    }
};

module.exports = controller;