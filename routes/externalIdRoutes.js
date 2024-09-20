const externalIdController = require("../controllers/externalIdController");
const { authentication } = require("../middleware/externalIdAuth");
const express = require("express");
const router = express.Router();

router
  .route("/:id")
  .get(authentication, externalIdController.getByIdExternalID);

router
  .route("/")
  .get(authentication, externalIdController.getExternalID)
  .post(authentication, externalIdController.postExternalId);

router.route("/").put(authentication, externalIdController.updateExternalId);

module.exports = router;
