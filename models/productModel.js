const mongoose = require("mongoose");

// a schema for stroing reviews for each product
const reviewsSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: { type: String, required: true },
    avatar: { type: String, required: true },
    rating: { type: Number, required: true, default: 0 },
    review: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    image1: {
      type: String,
    },
    image2: {
      type: String,
    },
    image3: {
      type: String,
    },
    image4: {
      type: String,
    },
    section_image: {
      type: String,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    full_description: {
      type: String,
    },
    ingredients: {
      type: String,
    },
    nutrition: {
      type: String,
    },
    number_of_cans: {
      type: Number,
      required: true,
    },
    subscription: {
      type: Boolean,
      // required: true,
      default: false,
    },
    stripeProductId: {
      type: String,
    },
    stripePriceId: [
      {
        interval: { type: String },
        id: { type: String },
      },
    ],
    // store an array of review objs
    reviews: [reviewsSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
