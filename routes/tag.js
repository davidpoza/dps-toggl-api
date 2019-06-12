"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const TagController = require("../controllers/tag");


router.post("/tags", md_auth.ensureAuthenticated, TagController.createTag);
// router.get("/projects", md_auth.ensureAuthenticated, ProjectController.getProjects);
router.delete("/tags/:id", md_auth.ensureAuthenticated, TagController.deleteTag);
// router.put("/projects/:id", md_auth.ensureAuthenticated, ProjectController.updateProject);



module.exports = router;