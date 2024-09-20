const express = require("express");

const contactController = require("../controllers/contactControllers");
const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");
const router = express.Router();

router
  .route("/")
  .post(contactController.createContact)
  .get(protectRoute, isAdmin, contactController.getContactData);
module.exports = router;
