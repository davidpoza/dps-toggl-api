"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const ProjectController = require("../controllers/project");


router.post("/projects", md_auth.ensureAuthenticated, ProjectController.createProject);
router.get("/projects", md_auth.ensureAuthenticated, ProjectController.getProjects);
router.delete("/projects/:id", md_auth.ensureAuthenticated, ProjectController.deleteProject);
// router.put("/tasks/:id", md_auth.ensureAuthenticated, TaskController.updateTask);



module.exports = router;