const mongoose = require("mongoose");
const productIdSchema = mongoose.Schema({
  productName: { type: String },
  ids: [
    {
      idType: { type: String },
      id: { type: String },
      itemDescription: { type: String },
      priceId: [{ frequency: { type: String }, id: { type: String } }],
    },
  ],
});

const ProductIds = mongoose.model("ProductIds", productIdSchema);
module.exports = ProductIds;
