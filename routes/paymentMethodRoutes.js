const express = require("express");
const router = express.Router();
const paymentMethodController = require("../controllers/paymentMethodController");
const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");

router
  .route("/attach-payment-method")
  .post(protectRoute, paymentMethodController.createPaymentMethod);

router
  .route("/get-all-payment-methods")
  .get(protectRoute, paymentMethodController.getAllPaymentMethods);

router
  .route("/detach-payment-method")
  .post(protectRoute, paymentMethodController.detachPaymentMethod);
router
  .route("/update-payment-method")
  .put(protectRoute, paymentMethodController.updatePaymentMethod);
router
  .route("/get-payment-method")
  .get(protectRoute, paymentMethodController.getPaymentMethod);

module.exports = router;
