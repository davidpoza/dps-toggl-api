"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const AuthController = require("../controllers/auth");

// router.get("/users/:page?", md_auth.ensureAuthenticated, UserController.getUsers);
// router.get("/users/:id", UserController.getUser);
// router.get("/usersbyemail/:email", UserController.getUserByEmail);
// router.put("/users/:id", md_auth.ensureAuthenticated, UserController.updateUser);
// router.delete("/users/:id", UserController.deleteUser);
router.post("/register", AuthController.register);
router.post("/authenticate", AuthController.login);
// router.get("/protegido", md_auth.ensureAuthenticated, UserController.protegido);

module.exports = router;