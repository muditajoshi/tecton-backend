const mongoose = require("mongoose");
const userTypeDiscountSchema = new mongoose.Schema({
  ambassadorReferral: {
    userType: { type: String, default: "AmbassadorReferral" },
    discountPercentArray: [],
    discountPercent: { type: Number },
    stripeFirstSubs: { type: String },
    stripe1Qty: { type: String },
    stripe2Qty: { type: String },
    stripe3Qty: { type: String },
    stripe4Qty: { type: String },
  },
  ambassador: {
    userType: { type: String, default: "Ambassador" },
    discountPercent: { type: Number },
    stripeFirstSubs: { type: String },
    stripe1Qty: { type: String },
    stripe2Qty: { type: String },
    stripe3Qty: { type: String },
    stripe4Qty: { type: String },
  },
  veteran: {
    userType: { type: String, default: "Veteran" },
    discountPercent: { type: Number },
    stripeFirstSubs: { type: String },
    stripe1Qty: { type: String },
    stripe2Qty: { type: String },
    stripe3Qty: { type: String },
    stripe4Qty: { type: String },
  },
  employee: {
    userType: { type: String, default: "Employee" },
    discountPercent: { type: Number },
    stripeFirstSubs: { type: String },
    stripe1Qty: { type: String },
    stripe2Qty: { type: String },
    stripe3Qty: { type: String },
    stripe4Qty: { type: String },
  },
  test: {
    userType: { type: String, default: "Test" },
    discountPercent: { type: Number },
    stripeFirstSubs: { type: String },
    stripe1Qty: { type: String },
    stripe2Qty: { type: String },
    stripe3Qty: { type: String },
    stripe4Qty: { type: String },
  },
});

const UserTypeDiscount = mongoose.model(
  "UserTypeDiscount",
  userTypeDiscountSchema
);
module.exports = UserTypeDiscount;
