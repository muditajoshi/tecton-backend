const express = require("express");
const ambassadorController = require("../controllers/ambassadorController");
const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");
const router = express.Router();

router
  .route("/")
  .post(ambassadorController.createAmbassador)
  .get(protectRoute, isAdmin, ambassadorController.getAmbassadorData);

router
  .route("/ambassador-approval")
  .put(protectRoute, isAdmin, ambassadorController.updateAmbassadorData);
module.exports = router;
