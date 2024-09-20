const mongoose = require("mongoose");
const ambassador_schema = new mongoose.Schema({
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
    unique: true,
  },
  where_did_you_hear_about_tecton: {
    type: String,
    required: true,
  },
  twitter_handle: {
    type: String,
  },
  instagram_handle: {
    type: String,
  },

  tiktok_handle: {
    type: String,
  },
  other_social_medial_link: {
    type: String,
  },
  short_bio: {
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
  approval: {
    type: String,
    default: null,
  },
});

const Ambassador = mongoose.model("ambassador", ambassador_schema);
module.exports = Ambassador;
