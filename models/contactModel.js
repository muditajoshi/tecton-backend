const mongoose = require("mongoose");
const contactModelSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  howCanWeHelpYou: {
    type: String,
    required: true,
  },
  message: {
    type: String,
  },
});

const contactModel = mongoose.model("contactUs", contactModelSchema);
module.exports = contactModel;
