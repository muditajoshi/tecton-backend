const express = require("express");
const cartController = require("../controllers/cartController");
const router = express.Router();

router.route("/user/:id").get(cartController.getCartById);
router.route("/:id/additem").put(cartController.addCartItem);
router.route("/:id/emptycart").delete(cartController.EmptyCartData);
router.route("/:id/items/:objid").delete(cartController.deleteCartItem);
router.route("/:id/items/:objid").put(cartController.updateQuantity);
router.route("/:id/localitem").put(cartController.getCartFromLocal);
module.exports = router;
