const mongoose = require("mongoose");
const addressSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  shippingAddress: [
    {
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
  ],
  billingAddress: [
    {
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
  ],
});

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
