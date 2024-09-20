const mongoose = require("mongoose");

const unsubscribeSchema = mongoose.Schema(
  {
    email: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    phoneNo: { type: String },
    subscription: { type: Object },
    reason: [
      {
        type: String,
      },
    ],

    message: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Unsubscribe = mongoose.model("Unsubscribe", unsubscribeSchema);
module.exports = Unsubscribe;
