"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const TaskController = require("../controllers/task");


router.post("/tasks", md_auth.ensureAuthenticated, TaskController.createTask);
router.get("/tasks", md_auth.ensureAuthenticated, TaskController.getTasks);
router.get("/tasks/:id", md_auth.ensureAuthenticated, TaskController.getTask);
router.delete("/tasks/:id", md_auth.ensureAuthenticated, TaskController.deleteTask);
router.put("/tasks/:id", md_auth.ensureAuthenticated, TaskController.updateTask);



module.exports = router;