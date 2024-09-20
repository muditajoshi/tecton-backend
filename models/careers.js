const mongoose = require("mongoose");
const careerSchema = new mongoose.Schema({
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
  where_did_you_hear_about_tecton: {
    type: String,
    required: true,
  },
  what_do_you_do: {
    type: String,
    required: true,
  },
  street_address: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  postal_code: {
    type: Number,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
});

const careers = new mongoose.model("careers", careerSchema);
module.exports = careers;
