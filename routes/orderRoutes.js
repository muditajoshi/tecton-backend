const express = require("express");
const {
  addOrderItems,
  getOrderById,
  // updateOrderToPay,
  updateOrderToDeliver,
  getMyOrders,
  getAllOrders,
  stripePayment,
  getAllUnpaidOrders,
  updateOrderToPaid,
  getOrderIDbyUserID,
} = require("../controllers/orderControllers.js");
const {
  protectRoute,
  isAdmin,
  rawExpress,
} = require("../middleware/authMiddleware.js");

const router = express.Router();

// @desc  create a new order, get all orders
// @route GET /api/orders
// @access PRIVATE && PRIVATE/ADMIN
router.route("/").post(addOrderItems).get(protectRoute, isAdmin, getAllOrders);
router
  .route("/get-all-unpaid-orders")
  .get(protectRoute, isAdmin, getAllUnpaidOrders);
// @desc  fetch the orders of the user logged in
// @route GET /api/orders/myorders
// @access PRIVATE
router.route("/myorders").get(protectRoute, getMyOrders);

// @desc  create payment intent for stripe payment
// @route POST /api/orders/stripe-payment
// @access PUBLIC
router.route("/stripe-payment").post(stripePayment);

// @desc  get an order by id
// @route GET /api/orders/:id
// @access PRIVATE
router.route("/:id").get(getOrderById);

// @desc  update the order object once paid
// @route PUT /api/orders/:id/pay
// @access PRIVATE
// router.route("/:id/pay").put(updateOrderToPay);

// @desc  update the order object once delivered
// @route PUT /api/orders/:id/pay
// @access PRIVATE/ADMIN
router.route("/:id/deliver").put(protectRoute, isAdmin, updateOrderToDeliver);

// @desc  update the order object once paid
// @route PUT /api/orders/:id/pay
// @access PRIVATE/ADMIN
router.route("/:id/topaid").put(protectRoute, isAdmin, updateOrderToPaid);

// @desc  get the latest order for the user
// @route PUT /api/orders/:userid/getorder
router.route("/:userid/getorder").get(getOrderIDbyUserID);

module.exports = router;
