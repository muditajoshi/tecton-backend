const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/orderModel.js");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const externalIdModel = require("../models/externalId");
const Subscription = require("../models/subscriptionModel");
const paymentMethodModel = require("../models/paymentMethodModel");
const generateToken = require("../utils/generateToken.js");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const Ambassador = require("../models/ambassador");
const express = require("express");
const app = express();
const axios = require("axios");
const generateGravatar = require("../utils/generateGravatar.js");
const User = require("../models/userModel.js");
const { json } = require("body-parser");
const OrderMetaData = require("../models/orderMetaModel.js");
const DiscountModel = require("../models/discountModel.js");
const { salesTax } = require("../middleware/salesOrderTaxMiddleware.js");
const UserMetaData = require("../models/userMetaModel.js");
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// const stripe = new Stripe("sk_test_51LJFGPSB8nk8ML9uvka0Xkj4mbafhqCrKNQM9B5s11v54MMJxXfBn5Ij93WwChfJIHUrJJh27Yhnyg7sa2hLKdc400QVM1o5Td");
// @desc  create a new order
// @route GET /api/orders
// @access PRIVATE
const addOrderItems = asyncHandler(async (req, res) => {
  // console.log("30------------", req.body);
  const {
    userType,
    orderItems,
    shippingAddress,
    billingAddress,
    paymentMethod,
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
    discountPercent,
    couponCode,
    firstPurchase,
    refCode,
  } = req.body;

  if (orderItems && !orderItems.length) {
    res.status(401);
    throw new Error("No order items");
  } else {
    var user = "";
    if (!req.body.user) {
      // guest user account creation start

      const userExists = await User.findOne({ email: shippingAddress.email });

      if (userExists) {
        user = userExists._id;
      } else {
        // the gravatar will be unique for each registered email
        const avatar = generateGravatar(shippingAddress.email);

        // customer created on stripe start
        const customer = await stripe.customers.create({
          email: shippingAddress.email,
          name: shippingAddress.firstName + " " + shippingAddress.lastName,
          description: "customer created",
        });
        // customer created on stripe end

        //  generate password code start
        const password = (Math.random() * 1e16).toString(36);
        //  generate password code end

        const guestUser = await User.create({
          userType: ["Guest"],
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          email: shippingAddress.email,
          password,
          avatar,
          "shippingAddress.address1": shippingAddress.address,
          "shippingAddress.city": shippingAddress.city,
          "shippingAddress.state": shippingAddress.state,
          "shippingAddress.zip": shippingAddress.postalCode,
          "shippingAddress.country": shippingAddress.country,
          "billingAddress.firstName": billingAddress.firstName,
          "billingAddress.lastName": billingAddress.lastName,
          "billingAddress.email": billingAddress.email,
          "billingAddress.address1": billingAddress.address,
          "billingAddress.city": billingAddress.city,
          "billingAddress.state": billingAddress.state,
          "billingAddress.zip": billingAddress.postalCode,
          "billingAddress.country": billingAddress.country,
          termsAndConditions: true,
          stripeCustomerId: customer.id,
        });

        // if user was created successfully
        if (guestUser) {
          // send a mail for email verification of the newly registred email id
          // await sendMail(user._id, email, "email verification");

          const refreshToken = generateToken(guestUser._id, "refresh");

          // External ID code start
          const collectionID = uuidv4();
          const getdata = [
            { id: guestUser._id, name: "TECTON" },
            { id: customer.id, name: "STRIPE" },
          ];
          const saveId = new externalIdModel({
            externalId: getdata,
            id: collectionID,
            idType: "CUSTOMER",
          });
          const dbID = await saveId.save();

          // External ID code end
        }

        // guest user account creation end

        var user = guestUser._id;
      }
    } else {
      var user = req.body.user;
    }

    //check order amount

    let itemsTotalPrice = 0;
    let priceTotal = 0;

    orderItems.map((items) => {
      itemsTotalPrice += items.qty * items.price;
      priceTotal += items.price;
    });
    // console.log("137",itemsTotalPrice,orderItems)

    let newShippingPrice = shippingPrice;

    const checkCoupon = await DiscountModel.findOne({ couponCode: couponCode });
    let checkDiscount = 0;
    if (checkCoupon) {
      checkDiscount = checkCoupon.discountPercentage;
    } else if (discountPercent > 0) {
      checkDiscount = discountPercent;
    }
    // else {
    //   checkDiscount = 0;
    // }
    const createTaxForOrder = {
      subsDiscount: checkDiscount,
      user: user,
      userType: [userType],
      order: {
        orderItems: orderItems,
        shippingAddress: shippingAddress,
        shippingPrice: newShippingPrice,
      },
    };

    const calculateTax = await salesTax({ order: [createTaxForOrder] });

    let newTax = 0;

    for (let i = 0; i < calculateTax.length; i++) {
      newTax += calculateTax[i].tax;
    }

    const subTotalPrice =
      Number(newTax) + Number(itemsTotalPrice) + Number(newShippingPrice);

    const discountPrice = (itemsTotalPrice / 100) * checkDiscount;

    const totalPrice = (subTotalPrice - discountPrice).toFixed(2);
    //check order amount end

    const order = new Order({
      user: user,
      userType: userType,
      orderItems: orderItems,
      shippingAddress: shippingAddress,
      billingAddress: billingAddress,
      paymentMethod: paymentMethod,
      itemsPrice: itemsTotalPrice,
      shippingPrice: newShippingPrice,
      taxPrice: newTax.toFixed(2),
      totalPrice: totalPrice,
    });

    const createdOrder = await order.save();
    const UserMetaFind = await UserMetaData.findOne({ userId: user });

    //ordermeta start
    if (refCode && couponCode) {
      // getAmbData
      const findData = await AmbassadorMetaData.find({ refCode: refCode });
      const getAmbData = await Ambassador.find({
        _id: findData[0].ambassadorId,
      });

      const ambName = getAmbData[0].firstName + " " + getAmbData[0].lastName;
      const ambCommission = totalPrice * (findData[0].commissionPercent / 100);

      const orderMeta = await OrderMetaData.create({
        orderId: order._id,
        refCode: refCode,
        ambName: ambName,
        couponCode: couponCode,
        discountPercent: checkDiscount,
        ambassadorCommission: Math.trunc(ambCommission * 100) / 100,
      });
    } else if (refCode) {
      // getAmbData
      const findData = await AmbassadorMetaData.find({ refCode: refCode });
      const getAmbData = await Ambassador.find({
        _id: findData[0].ambassadorId,
      });

      const ambName = getAmbData[0].firstName + " " + getAmbData[0].lastName;
      const ambCommission = totalPrice * (findData[0].commissionPercent / 100);

      const orderMeta = await OrderMetaData.create({
        orderId: order._id,
        refCode: refCode,
        ambName: ambName,
        discountPercent: checkDiscount,
        ambassadorCommission: Math.trunc(ambCommission * 100) / 100,
      });
    } else if (
      userType == "Ambassador" ||
      userType == "Employee" ||
      userType == "Veteran" ||
      userType == "Test"
    ) {
      const orderMeta = await OrderMetaData.create({
        orderId: order._id,

        discountPercent: checkDiscount,
      });
    } else if (couponCode) {
      // when only coupon code exists for all users
      const orderMeta = await OrderMetaData.create({
        orderId: order._id,
        couponCode: couponCode,
        discountPercent: checkDiscount,
      });
    } else if (
      UserMetaFind &&
      UserMetaFind.ambassador.refCode != undefined &&
      userType == "Guest"
    ) {
      // getAmbData
      const findData = await AmbassadorMetaData.find({
        refCode: UserMetaFind.ambassador.refCode,
      });

      const getAmbData = await Ambassador.find({
        _id: findData[0].ambassadorId,
      });

      const ambName = getAmbData[0].firstName + " " + getAmbData[0].lastName;

      const ambCommission = totalPrice * (findData[0].commissionPercent / 100);

      const orderMeta = await OrderMetaData.create({
        orderId: order._id,
        discountPercent: 0,
        refCode: UserMetaFind.ambassador.refCode,
        ambName: ambName,
        ambassadorCommission: Math.trunc(ambCommission * 100) / 100,
      });
    }
    //ordermeta end

    // External ID code start
    // const collectionID = uuidv4();
    // const getdata = { id: order._id, name: "TECTON" };
    // const saveId = new externalIdModel({
    //   externalId: getdata,
    //   id: collectionID,
    //   idType: "ORDER",
    // });
    // const dbID = await saveId.save();
    // External ID code end

    res.status(201).json(createdOrder);
  }
});

// @desc  get an order by id
// @route GET /api/orders/:id
// @access PRIVATE
const getOrderById = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    const reqOrder = await Order.findById(id);
    const orderMeta = await OrderMetaData.find({ orderId: reqOrder._id });
    if (orderMeta.length > 0) {
      const data = await Order.aggregate([
        {
          $lookup: {
            from: "ordermetadatas",
            localField: "_id",
            foreignField: "orderId",
            as: "orderMetaData",
          },
        },
      ]);
      getData = data.filter((value) => {
        return value._id == id;
      });
    }

    if (orderMeta.length > 0) {
      return res.status(201).json(getData[0]);
    } else if (reqOrder) {
      return res.status(201).json(reqOrder);
    } else {
      res.status(401);
      throw new Error("Order not found");
    }
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
});

// @desc  update the order object once paid
// @route PUT /api/orders/:id/pay
// @access PRIVATE
// const updateOrderToPay = asyncHandler(async (req, res) => {
//   const order = await Order.findById(req.params.id);
//   if (order) {
//     const { paymentMode } = req.body;
//     order.isPaid = true;
//     order.paidAt = Date.now();
//     // update the payment result based on which mode of payment was chosen
//     if (paymentMode === "paypal") {
//       order.paymentResult = {
//         type: "paypal",
//         id: req.body.id,
//         status: req.body.status,
//         update_time: req.body.update_time,
//         email_address: req.body.payer.email_address,
//       };
//     } else if (paymentMode === "stripe") {
//       order.paymentResult = {
//         type: "stripe",
//         id: req.body.id,
//         status: req.body.status,
//         email_address: req.body.receipt_email,
//       };
//     }

//     const updatedOrder = await order.save();
//     res.status(201).json(updatedOrder);
//   } else {
//     res.status(401);
//     throw new Error("Order not found");
//   }
// });

// @desc  update the order object once delivered
// @route PUT /api/orders/:id/pay
// @access PRIVATE/ADMIN
const updateOrderToDeliver = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();

    const updatedOrder = await order.save();
    res.status(201).json(updatedOrder);
  } else {
    res.status(401);
    throw new Error("Order not found");
  }
});

const updateOrderToPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (order) {
    order.isPaid = true;
    // order.paymentResult.update_time = Date.now();
    order.paymentResult.status = "succeeded";
    order.paidAt = req.body.paidAt;
    order.paymentResult.email_address = req.body.email_address;
    order.paymentResult.id = req.body.paymentId;

    const updatedOrder = await order.save();
    res.status(201).json(updatedOrder);
  } else {
    res.status(401);
    throw new Error("Order not found");
  }
});
// @desc  fetch the orders of the user logged in
// @route GET /api/orders/myorders
// @access PRIVATE
const getMyOrders = asyncHandler(async (req, res) => {
  // sort orders in descending order of the date they were created at, hence negetive sign
  // const allOrders = await Order.find({ user: req.user._id, isPaid: true }).sort(
  //   "-createdAt"
  // );
  const data = await Order.aggregate([
    {
      $lookup: {
        from: "ordermetadatas",
        localField: "_id",
        foreignField: "orderId",
        as: "orderData",
      },
    },
  ]).sort("-createdAt");

  const orderMeta = data.filter((res) => {
    return res.user == req.user._id && res.isPaid == true;
  });
  res.json(orderMeta);
});

const getAllUnpaidOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination
  const pageSize = 200; // total number of entries on a single page

  const count = await Order.countDocuments({ isPaid: false }); // total number of documents available

  // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
  // and limiting the number of documents included in this request
  // sort this in desc order that the document was created at
  // const orders = await Order.find({ isPaid: false })
  //   .limit(pageSize)
  //   .skip(pageSize * (page - 1))
  //   .sort("-createdAt");

  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "ordermetadatas",
        localField: "_id",
        foreignField: "orderId",
        as: "orderMetaData",
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    { $match: { isPaid: false } },
  ]);

  // send the list of orders, current page number, total number of pages available
  res.json({
    orders,
    // page,
    // pages: Math.ceil(count / pageSize),
    total: count,
  });
});
// @desc  fetch all orders
// @route GET /api/orders
// @access PRIVATE/ADMIN
const getAllOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination

  const pageSize = 200; // total number of entries on a single page

  const count = await Order.countDocuments({ isPaid: true }); // total number of documents available

  // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
  // and limiting the number of documents included in this request
  // sort this in desc order that the document was created at
  // const orders = await Order.aggregate([
  //   {
  //     $lookup: {
  //       from: "ordermetadatas",
  //       localField: "_id",
  //       foreignField: "orderId",
  //       as: "orderMetaData",
  //     },
  //   },
  //   {
  //     $sort: { createdAt: -1 },
  //   },
  //   { $match: { isPaid: true } },
  // ]);
  const orders = await Order.aggregate([
    {
      $lookup: {
        from: "ordermetadatas",

        localField: "_id",

        foreignField: "orderId",

        as: "orderMetaData",
      },
    },

    {
      $sort: { createdAt: -1 },
    },

    { $match: { isPaid: true } },
  ])
    .skip(pageSize * (page - 1))
    .limit(pageSize);
  // send the list of orders, current page number, total number of pages available
  res.json({
    orders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc  create payment intent for stripe payment
// @route POST /api/orders/stripe-payment
// @access PUBLIC
const stripePayment = asyncHandler(async (req, res) => {
  const {
    price,
    email,
    orderID,
    firstName,
    lastName,
    stripeCustomerId,
    paymentMethod,
    savePaymentMethod,
    tectonUserId,
    postalCode,
    cvv,
  } = req.body;

  if (stripeCustomerId && paymentMethod) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: stripeCustomerId,
        amount: price,
        currency: process.env.CURRENCY,
        receipt_email: email,
        payment_method_types: ["card"],
        metadata: {
          Address_Country: "US",
          Address_PostalCode: postalCode,
          tectonOrderID: orderID,
          name: firstName + " " + lastName,
        },
      });

      const confirmPaymentIntent = await stripe.paymentIntents.confirm(
        paymentIntent.id,
        {
          payment_method: paymentMethod,
        }
      );

      if (confirmPaymentIntent.status == "succeeded") {
        res.status(200).json({
          message: "order has been placed successfully",
          data: confirmPaymentIntent,
        });
      } else {
        res.status(400).json({ message: "order failed" });
      }
    } catch (err) {
      res.status(400).json({ err: err.message });
    }
  } else {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: process.env.CURRENCY,
        receipt_email: email,
        payment_method_types: ["card"],
        metadata: {
          Address_Country: "US",
          Address_PostalCode: 32771,
          tectonOrderID: orderID,
          name: firstName + " " + lastName,
        },
      });

      // send this payment intent to the client side
      console.log(paymentIntent.client_secret);

      res.json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (err) {
      res.status(400).json({ err: err.message });
    }
  }
});

// @desc  get an order id
// @route GET /api/orders/:userid/getorder
// @access PRIVATE
const getOrderIDbyUserID = asyncHandler(async (req, res) => {
  const userid = req.params.userid;
  try {
    const lastOrder = await Order.findOne({ user: userid })
      .sort({ createdAt: -1 }) // Sort by createdAt in descending order to get the latest order
      .select("_id"); // Only select the _id field to get the order ID
    res.json(lastOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = {
  addOrderItems,
  getOrderById,
  // updateOrderToPay,
  updateOrderToDeliver,
  getMyOrders,
  getAllOrders,
  getAllUnpaidOrders,
  stripePayment,
  updateOrderToPaid,
  getOrderIDbyUserID,
};
