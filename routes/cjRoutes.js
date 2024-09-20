const express = require("express");

const cjController = require("../controllers/cjControllers")

const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");
const router = express.Router();

router
  .route("/")
  .post(cjController.createCJ);
module.exports = router;
