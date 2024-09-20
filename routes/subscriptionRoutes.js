const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");

router
  .route("/my-subscriptions")
  .get(protectRoute, subscriptionController.getSubsByUserId);

router
  .route("/:id/get-subscription-by-id")
  .get(protectRoute, subscriptionController.getSubsById);

router
  .route("/admin/unsubscribe-list")
  .get(protectRoute, isAdmin, subscriptionController.getUnsubscribeAll);
router
  .route("/stripe-payment-subscription")
  .post(protectRoute, subscriptionController.subscription);

router
  .route("/:id/cancel-subscription")
  .post(protectRoute, subscriptionController.cancelSubscription);

router
  .route("/admin/subscriptions-list")
  .get(protectRoute, isAdmin, subscriptionController.getAllSubs);

router
  .route("/edit-subscription-quantity")
  .post(protectRoute, subscriptionController.updateSubscriptionQuantity);

router
  .route("/edit-subscription-frequency")
  .post(protectRoute, subscriptionController.updateSubscriptionFrequency);

router
  .route("/update-address")
  .put(protectRoute, subscriptionController.updateShippingBillingAdd);

router
  .route("/:id/skip-order")
  .post(protectRoute, subscriptionController.skipOrder);

router
  .route("/:id/ship-now")
  .post(protectRoute, subscriptionController.shipNow);

router
  .route("/:id/modify")
  .post(protectRoute, subscriptionController.modifyShipment);

module.exports = router;
