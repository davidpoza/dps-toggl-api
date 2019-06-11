"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const UserController = require("../controllers/user");


router.get("/users", md_auth.ensureAuthenticated, UserController.getUsers);
router.get("/users/me", md_auth.ensureAuthenticated, UserController.getMe);
router.put("/users/:id", md_auth.ensureAuthenticated, UserController.updateUser);
router.delete("/users/:id", md_auth.ensureAuthenticated, UserController.deleteUser);


module.exports = router;