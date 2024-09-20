const mongoose = require("mongoose");
const externalId_schema = new mongoose.Schema({
  externalId: [{ _id: false, id: { type: String }, name: { type: String } }],

  id: { type: String },
  idType: { type: String },
  status: { type: String },
});

const externalId = mongoose.model("externalId", externalId_schema);
module.exports = externalId;
