const mongoose = require("mongoose");
const cartSchema = mongoose.Schema(
  {
    user: {
      ref: "User",
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "Product",
        },
        qty: { type: Number, required: true, default: 0 },
        name: { type: String, required: true },
        price: { type: Number, required: true, default: 0 },
        image: { type: String, required: true },
        itemTotalPrice: { type: Number, default: 0, required: true },
        numberOfCans: { type: Number },
        subscription: { type: Boolean },
        frequency: { type: String },
        stripeProductId: { type: String },
        stripePriceId: { id: { type: String }, interval: { type: String } },
      },
    ],
    subtotal: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
