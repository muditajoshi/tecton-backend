const express = require("express");

const preOrderController = require("../controllers/preOrderController");
const router = express.Router();

router.route("/").post(preOrderController.createPreOrder);
module.exports = router;
