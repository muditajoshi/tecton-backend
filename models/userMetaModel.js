const mongoose = require("mongoose");
const userMetaData = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },

  firstPurchase: { type: Boolean, default: false },
  ambassador: {
    refCode: { type: String },
    dateOfFirstOrder: { type: String },
    discountPercent: { type: Number, default: 5 },
    referalOrderId: { type: String },
    orderIds: [{ type: String }],
  },
  employee: {
    id: { type: String },
    discountPercentOrder: { type: Number, default: 0 },
    discountPercentSubscription: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
  },
  veteran: {
    id: { type: String },
    discountPercentOrder: { type: Number, default: 0 },
    discountPercentSubscription: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
  },
  test: {
    id: { type: String },
    discountPercentOrder: { type: Number, default: 0 },
    discountPercentSubscription: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: false },
  },

  discountCodes: {
    coupons: [{ type: Object }],
  },
});

const UserMetaData = mongoose.model("UserMetaData", userMetaData);
module.exports = UserMetaData;
