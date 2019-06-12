"use strict";

const express = require("express");
const router  = express.Router();

const multipart           = require("connect-multiparty");
const multipartMiddleware = multipart({ uploadDir: "./uploads" });

const md_auth        = require("../middleware/auth");
const TagController = require("../controllers/tag");


router.post("/tags", md_auth.ensureAuthenticated, TagController.createTag);
router.get("/tags", md_auth.ensureAuthenticated, TagController.getTags);
router.delete("/tags/:id", md_auth.ensureAuthenticated, TagController.deleteTag);
router.put("/tags/:id", md_auth.ensureAuthenticated, TagController.updateTag);



module.exports = router;