const mongoose = require("mongoose");

const orderMetaSchema = mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", unique: true },
  refCode: { type: String },
  couponCode: { type: String },
  discountPercent: { type: Number },
  ambassadorCommission: { type: Number },
  ambName: { type: String },
  orderStatus: { type: String },
  shipStationOrderId: { type: String },
});

const OrderMetaData = mongoose.model("orderMetaData", orderMetaSchema);

module.exports = OrderMetaData;
