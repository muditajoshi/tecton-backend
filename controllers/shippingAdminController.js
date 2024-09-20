const ProductIds = require("../models/productIdModel");
const GlobalValuesModel = require("../models/globalValuesModel");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.updateShippingPrice = async (req, res) => {
  try {
    const { shippingPrice } = req.body;
    const getShippingPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });
    if (!getShippingPrice) {
      const createShippingPrice = new GlobalValuesModel({
        "utility.utilityType": "Shipping Price",
        "utility.price": shippingPrice,
      });
      const saveData = await createShippingPrice.save();
    } else if (shippingPrice == getShippingPrice.utility.price) {
    } else {
      // updating the shipping price in globalvalues collection
      const updateShippingPrice = await GlobalValuesModel.updateOne(
        { "utility.utilityType": "Shipping Price" },
        { $set: { "utility.price": shippingPrice } }
      );

      //   fetching the shipping products from stripe
      const products = await stripe.products.list({
        limit: 100,
      });

      let shippingProductId;
      const mapProducts = products.data.map((result) => {
        if (result.metadata.name == "SHIPPING" + shippingPrice) {
          shippingProductId = result.id;
        }
      });

      if (shippingProductId) {
        const product = await stripe.products.retrieve(shippingProductId);
        const prices = await stripe.prices.list({
          product: product.id,
        });

        let stripePriceId = [];
        for (let i = prices.data.length - 1; i >= 0; i--) {
          stripePriceId = [
            ...stripePriceId,
            {
              frequency: prices.data[i].recurring.interval_count + " weeks",
              id: prices.data[i].id,
            },
          ];
        }

        const updateShippingIds = await ProductIds.find({
          productName: "Shipping Price",
        });

        updateShippingIds[0].ids[0].priceId = stripePriceId;

        const saveData = await updateShippingIds[0].save();
      } else {
        //   creating the shipping product on stripe
        const stripeProductId = await stripe.products.create({
          name: "SHIPPING PRICE",
          metadata: { name: "SHIPPING" + shippingPrice },
          description: "Shipping product",
        });
        // console.log("47------------", stripeProductId);

        let intervalCount = 2;
        let stripePriceId = [];
        for (i = 0; i < 3; i++) {
          const priceId = await stripe.prices.create({
            unit_amount: shippingPrice * 100,
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
              frequency: priceId.recurring.interval_count + " weeks",
            },
          ];
        }

        const updateShippingIds = await ProductIds.find({
          productName: "Shipping Price",
        });

        updateShippingIds[0].ids[0].priceId = stripePriceId;

        const saveData = await updateShippingIds[0].save();
      }
    }
    res.status(200).json({
      message: "ShippingPrice updated succesfully",
      shippingPrice: shippingPrice,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getShippingPrice = async (req, res) => {
  try {
    const getPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });

    res.status(200).json({ shippingPrice: getPrice.utility.price });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
