const mongoose = require("mongoose");
const paymentMethodSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  paymentMethods: {
    type: Object,
  },
  defaultPaymentMethod: { type: String },
});

const paymentMethod = mongoose.model("paymentMethod", paymentMethodSchema);
module.exports = paymentMethod;
