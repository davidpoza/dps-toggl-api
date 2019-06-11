"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const TaskController = require("../controllers/task");


router.post("/tasks", md_auth.ensureAuthenticated, TaskController.createTask);
router.delete("/tasks/:id", md_auth.ensureAuthenticated, TaskController.deleteTask);



module.exports = router;