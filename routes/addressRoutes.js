const express = require("express");
const addressController = require("../controllers/addressController");
const router = express.Router();
const { protectRoute, isAdmin } = require("../middleware/authMiddleware.js");

router.route("/user").get(protectRoute, addressController.getAddressByUserId);
router
  .route("/:id/get-by-address-id")
  .get(protectRoute, addressController.getAddressByAddressId);
router.route("/add-address").post(protectRoute, addressController.addAddress);
router
  .route("/:id/update-address")
  .put(protectRoute, addressController.updateAddress);
router
  .route("/:id/delete-address")
  .delete(protectRoute, addressController.deleteAddress);
module.exports = router;
