const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel.js");
const externalIdModel = require("../models/externalId");
const { v4: uuidv4 } = require("uuid");
const Stripe = require("stripe");
const dotenv = require("dotenv");
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// @desc fetch all the products
// @route GET /api/products
// @access PUBLIC
const getAllProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1; // the current page number being fetched
  const pageSize = Number(req.query.pageSize) || 10; // the total number of entries on a single page

  // match all products which include the string of chars in the keyword, not necessarily in the given order
  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: "si",
        },
      }
    : {};
  const count = await Product.countDocuments({ ...keyword }); // total number of products which match with the given key

  // find all products that need to be sent for the current page, by skipping the documents included in the previous pages
  // and limiting the number of documents included in this request
  const products = await Product.find({ ...keyword })
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  // send the list of products, current page number, total number of pages available
  res.json({ products, page, pages: Math.ceil(count / pageSize) });
});

// @desc Fetch a single product by id
// @route GET /api/products/:id
// @access PUBLIC
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    res.json(product);
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc Delete a product
// @route DELETE /api/products/:id
// @access PRIVATE/ADMIN
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    await product.remove();
    res.json({ message: "Product removed from DB" });
  } else {
    // throw a custom error so that our error middleware can catch them and return apt json
    res.status(404);
    throw new Error("Product not found");
  }
});

// @desc Create a product
// @route POST /api/products/
// @access PRIVATE/ADMIN
const createProduct = asyncHandler(async (req, res) => {
  // create a dummy product which can be edited later

  const product = new Product({
    name: "Tecton",
    brand: "Tecton",
    category: "Tecton",
    numReviews: 0,
    countInStock: 0,
    price: 0,
    user: req.user._id,
    image: "Tecton Product Image 1",
    image1: "Tecton Product Image 2",
    image2: "Tecton Product Image 3",
    image3: "Tecton Product Image 4",
    image4: "Tecton Product Image 5",
    section_image: "Section image",
    description: "Tecton Description",
    full_description: "Full Description",
    ingredients: "Ingredients",
    nutrition: "Nutrition",
    number_of_cans: 0,
    subscription: false,
  });

  const createdProduct = await product.save();

  res.status(201).json(createdProduct);
});

// @desc Update a product
// @route PUT /api/products/:id
// @access PRIVATE/ADMIN
const updateProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    brand,
    category,
    numReviews,
    countInStock,
    description,
    image,
    image1,
    image2,
    image3,
    image4,
    section_image,
    full_description,
    ingredients,
    nutrition,
    number_of_cans,
    subscription,
  } = req.body;
  const product = await Product.findById(req.params.id);

  let getstripeProductId;
  let getPriceIdArray;
  if (!product.stripeProductId) {
    const stripeProductId = await stripe.products.create({
      name: name,
      // tax_code: "txcd_99999999",
      description: description,
    });
    console.log(stripeProductId);
    getstripeProductId = stripeProductId.id;
    let intervalCount = 2;
    let stripePriceId = [];
    for (i = 0; i < 3; i++) {
      const priceId = await stripe.prices.create({
        unit_amount: price * 100,
        currency: process.env.CURRENCY,
        // tax_behavior: "exclusive",
        recurring: {
          interval: "week",
          interval_count: intervalCount,
        },
        product: stripeProductId.id,
      });
      intervalCount += 2;
      stripePriceId = [
        ...stripePriceId,
        {
          id: priceId.id,
          interval: priceId.recurring.interval_count + " weeks",
        },
      ];
    }

    getPriceIdArray = stripePriceId;
  }

  // update the fields which are sent with the payload

  if (product) {
    if (name) product.name = name;
    if (price) product.price = price;
    if (brand) product.brand = brand;
    if (category) product.category = category;
    if (numReviews) product.numReviews = numReviews;
    if (countInStock) product.countInStock = countInStock;
    if (description) product.description = description;
    if (image) product.image = image;
    if (image1) product.image1 = image1;
    if (image2) product.image2 = image2;
    if (image3) product.image3 = image3;
    if (image4) product.image4 = image4;
    if (section_image) product.section_image = section_image;
    if (full_description) product.full_description = full_description;
    if (ingredients) product.ingredients = ingredients;
    if (nutrition) product.nutrition = nutrition;
    if (number_of_cans) product.number_of_cans = number_of_cans;
    if (getstripeProductId) product.stripeProductId = getstripeProductId;
    if (getPriceIdArray) product.stripePriceId = getPriceIdArray;

    const check = await Product.updateOne(
      { _id: req.params.id },
      {
        $set: {
          subscription: subscription,
        },
      }
    );
    // if (subscription) product.subscription = subscription;
    // External ID code start
    const collectionID = uuidv4();
    const getdata = [
      { id: product._id, name: "TECTON" },
      { id: getstripeProductId, name: "STRIPE" },
    ];
    const saveId = new externalIdModel({
      externalId: getdata,
      id: collectionID,
      idType: "PRODUCT",
    });
    const dbID = await saveId.save();
    // External ID code end
    const updatedProduct = await product.save();
    const productCheck = await Product.findById(req.params.id);
    if (updatedProduct) res.status(201).json(productCheck);
  } else {
    res.status(404);
    throw new Error("Product not available");
  }
});

// @desc Create a product review
// @route POST /api/products/:id/reviews
// @access PRIVATE
const createProductReview = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  const product = await Product.findById(req.params.id);
  if (product) {
    // If the user has already reviewed this product, throw an error
    const reviewedAlready = product.reviews.find(
      (rev) => rev.user.toString() === req.user._id.toString()
    );
    if (reviewedAlready) {
      res.status(400);
      throw new Error("Product Already Reviewed");
    }

    const newReview = {
      name: req.user.name,
      user: req.user._id,
      avatar: req.user.avatar,
      rating: Number(rating),
      review,
    };

    // store the new review and update the rating of this product
    product.reviews.push(newReview);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, ele) => acc + ele.rating, 0) /
      product.numReviews;
    const updatedProduct = await product.save();
    if (updatedProduct) res.status(201).json({ message: "Review Added" });
  } else {
    res.status(404);
    throw new Error("Product not available");
  }
});

// @desc fetch top rated products
// @route GET /api/products/top
// @access PUBLIC
const getTopProducts = asyncHandler(async (req, res) => {
  // get top 4 rated products
  const topProducts = await Product.find({}).sort({ rating: -1 }).limit(4);
  res.json(topProducts);
});

module.exports = {
  getProductById,
  getAllProducts,
  deleteProduct,
  createProduct,
  updateProduct,
  createProductReview,
  getTopProducts,
};
