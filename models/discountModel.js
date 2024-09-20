const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    couponCode: {
      type: String,
      unique: true,
    },
    description: {
      type: String,
    },
    validforAll: {
      type: Boolean,
    },
    expiryDate: {
      type: String,
    },
    effectiveDate: {
      type: String,
    },
    minimumOrderValue: {
      type: Number,
    },
    usageLimit: {
      type: Number,
    },
    discountPercentage: {
      type: Number,
    },
    firstTimeUser: {
      type: Boolean,
    },
    excludedProducts: {
      type: Array,
    },
  },
  {
    timestamps: true,
  }
);

const DiscountModel = mongoose.model("DiscountCode", discountSchema);
module.exports = DiscountModel;
