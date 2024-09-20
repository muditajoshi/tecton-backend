const mongoose = require("mongoose");

const subscriptionMetaSchema = mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    unique: true,
  },
  orderId: { type: String },
  refCode: { type: String },
  discountPercent: { type: Number },
  ambassadorCommission: { type: Number },
});

const SubscriptionMetaData = mongoose.model(
  "subscriptionMetaData",
  subscriptionMetaSchema
);

module.exports = SubscriptionMetaData;
