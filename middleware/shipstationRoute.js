const express = require("express");
const shipStation = require("./shipstationWebhooks");
const router = express.Router();

router.route("/").post(shipStation);

module.exports = router;
