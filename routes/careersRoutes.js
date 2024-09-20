const express = require("express");
const careersController = require("../controllers/carrersController");
const router = express.Router();

router.route("/").post(careersController.careersController);

module.exports = router;
