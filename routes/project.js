"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const ProjectController = require("../controllers/project");


router.post("/projects", md_auth.ensureAuthenticated, ProjectController.createProject);
router.get("/projects", md_auth.ensureAuthenticated, ProjectController.getProjects);
router.get("/projects/:id", md_auth.ensureAuthenticated, ProjectController.getProjectById);
router.delete("/projects/:id", md_auth.ensureAuthenticated, ProjectController.deleteProject);
router.put("/projects/:id", md_auth.ensureAuthenticated, ProjectController.updateProject);



module.exports = router;