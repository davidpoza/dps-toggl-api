"use strict";
const avatar_size_limit   = process.env.AVATAR_SIZE_LIMIT ? parseInt(process.env.AVATAR_SIZE_LIMIT)*1048576 : 2097152; //en bytes
const express             = require("express");
const router              = express.Router();
const multipart           = require("connect-multiparty");
const path                = require("path");
const multipartMiddleware = multipart({ uploadDir: path.join(process.env.UPLOAD_DIR, "temp"), maxFilesSize : avatar_size_limit });


const md_auth        = require("../middleware/auth");
const UserController = require("../controllers/user");


router.get("/users", md_auth.ensureAuthenticated, UserController.getUsers);
router.get("/users/me", md_auth.ensureAuthenticated, UserController.getMe);
router.get("/users/avatar/:image", UserController.getAvatarImage);
router.get("/users/:id", md_auth.ensureAuthenticated, UserController.getUser);
router.put("/users/:id", md_auth.ensureAuthenticated, multipartMiddleware, UserController.updateUser);
router.delete("/users/:id", md_auth.ensureAuthenticated, UserController.deleteUser);

module.exports = router;