const mongoose = require("mongoose");
const globalValuesSchema = mongoose.Schema(
  {
    utility: {
      utilityType: { type: String },
      price: { type: Number },
      govxCode: { type: String },
    },
  },
  { timestamps: true }
);

const GlobalValuesModel = mongoose.model("GlobalValues", globalValuesSchema);
module.exports = GlobalValuesModel;
