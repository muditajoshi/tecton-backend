const express = require("express");
const router = express.Router();

const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");
const discountController = require("../controllers/discountController");
const {
  getAllDiscount,
  createDiscount,
  getDiscount,
  deleteDiscount,
  updateDiscount,
  applyDiscount,
} = discountController;

router
  .route("/get-all-userType-discount")
  .get(protectRoute, isAdmin, discountController.getAllUserTypeDiscount);

router
  .route("/user-type-discount")
  .put(protectRoute, isAdmin, discountController.createUserTypeDiscount);

router.route("/get-all-discount").get(protectRoute, isAdmin, getAllDiscount);

router.route("/create-discount").post(protectRoute, isAdmin, createDiscount);
router.route("/apply-discount").post(applyDiscount);
router
  .route("/get-discount-by-id/:_id")
  .get(protectRoute, isAdmin, getDiscount);
router
  .route("/update-discount/:_id")
  .put(protectRoute, isAdmin, updateDiscount);
// router.route("/get-discount-by-id").get(protectRoute, isAdmin, getDiscount);
router.route("/delete-discount").delete(protectRoute, isAdmin, deleteDiscount);

module.exports = router;
