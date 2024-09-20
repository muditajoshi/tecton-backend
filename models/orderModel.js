const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    // add a reference to the corresponding user
    user: {
      // type: mongoose.Schema.Types.ObjectId,
      // required: true,
      // ref: "User",
      type: String,
    },
    userType: [
      {
        type: String,
        // required: true,
      },
    ],

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
      },
    ],
    shippingAddress: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      state: { type: String, required: true },
      phoneNo: { type: String, required: true },
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
    paymentMethod: {
      type: String,
      required: true,
    },
    // depends on if stripe or paypal method is used
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
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
    isPaid: {
      type: Boolean,
      default: false,
    },
    isDelivered: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
