"use strict";

const express = require("express");
const router  = express.Router();

const md_auth        = require("../middleware/auth");
const AuthController = require("../controllers/auth");

router.post("/register", AuthController.register);
router.post("/authenticate", AuthController.login);
router.post("/refresh", md_auth.ensureAuthenticated, AuthController.refresh);


module.exports = router;