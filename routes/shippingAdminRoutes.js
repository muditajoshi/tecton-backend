const express = require("express");
const router = express.Router();
const shippingAdminController = require("../controllers/shippingAdminController");
const { protectRoute, isAdmin } = require("../middleware/authMiddleware");
router
  .route("/get-shipping-price")
  .get(shippingAdminController.getShippingPrice);
router
  .route("/update-shipping-price")
  .put(protectRoute, isAdmin, shippingAdminController.updateShippingPrice);

module.exports = router;
