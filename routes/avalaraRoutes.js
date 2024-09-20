const avalaraController = require("../controllers/avalaraTaxControllers");
const express = require("express");
const router = express.Router();

router.route("/create-transaction").post(avalaraController.calculateTax);

router
  .route("/create-customer-avalara")
  .post(avalaraController.createCustomerAvalara);
module.exports = router;
