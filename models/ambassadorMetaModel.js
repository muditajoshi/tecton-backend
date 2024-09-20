const mongoose = require("mongoose");
const AutoIncrementFactory = require("mongoose-sequence");

const AutoIncrement = AutoIncrementFactory(mongoose);

const ambassadorMetaSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  discountPercent: { type: Number },
  ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Ambassador" },
  commissionPercent: { type: Number, default: 10 },
  commissionedAmount: { type: Number, default: 0 },
  ambassadorNo: { type: Number },
  refCode: { type: String, unique: true },
  orderList: [
    {
      _id: false,
      orderId: { type: String },
      orderCommission: { type: Number },
    },
  ],
});

ambassadorMetaSchema.plugin(AutoIncrement, { inc_field: "ambassadorNo" });

const AmbassadorMetaData = mongoose.model(
  "ambassadorMetaData",
  ambassadorMetaSchema
);

module.exports = AmbassadorMetaData;
