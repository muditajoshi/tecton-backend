const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    skipOrder: {
      type: Date,
    },
    discount: {
      type: Number,
      default: 0,
    },
    userType: [
      {
        type: String,
      },
    ],
    stripeData: [{ type: Object }],
    order: {
      orderItems: [
        {
          qty: { type: Number, required: true, default: 0 },
          name: { type: String, required: true },
          price: { type: Number, required: true, default: 0 },
          image: { type: String, required: true },
          product: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Product",
          },
          itemTotalPrice: { type: Number },
          subscription: { type: Boolean },
          frequency: { type: String },
          stripeProductId: { type: String },
          stripePriceId: { id: { type: String }, interval: { type: String } },
          taxPercent: { type: Number },
          nextBillingDate: { type: String },
          shippingPriceId: { type: String },
        },
      ],
      shippingAddress: {
        firstName: { type: String },
        lastName: { type: String },
        email: { type: String },
        address: { type: String },
        city: { type: String },
        postalCode: { type: String },
        country: { type: String },
        state: { type: String },
        phoneNo: { type: String },
        apt: { type: String },
      },
      billingAddress: {
        firstName: { type: String },
        lastName: { type: String },
        email: { type: String },
        address: { type: String },
        city: { type: String },
        postalCode: { type: String },
        country: { type: String },
        state: { type: String },
        phoneNo: { type: String },
        apt: { type: String },
      },

      // depends on if stripe or paypal method is used

      itemsPrice: {
        type: Number,
        required: true,
        default: 0.0,
      },
      taxPrice: {
        type: Number,
        required: true,
        default: 0.0,
      },
      shippingPrice: {
        type: Number,
        required: true,
        default: 0.0,
      },
      totalPrice: {
        type: Number,
        required: true,
        default: 0.0,
      },

      isDelivered: {
        type: Boolean,
        default: false,
      },
      deliveredAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = Subscription;
