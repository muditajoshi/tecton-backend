//  Tectonlife.com Developed by: S3B Global

// `Email: info@s3bglobal.com, sunil@s3bglobal.com`

// Development Team: Rajat Sharma, Mudita Joshi

//updated at Date time : 24 aug 2023, 16:48 PM IST

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db.js");
const colors = require("colors"); // color the statements in the server side console log
const morgan = require("morgan"); // show the API endpoints
const compression = require("compression"); // use gzip compression in the express server
const cors = require("cors"); // allow cross origin requests
const passport = require("passport"); // for all social login options
const cookieSession = require("cookie-session"); // for implementing cookie sessions for passport
const flash = require("connect-flash"); // so that passport flash messages can work
const path = require("path");
const helmet = require("helmet");
const xss = require("xss-clean");
const url = require("url");
const stripe = require("stripe");
const axios = require("axios");
// const rfs = require("rotating-file-stream");
const { v4: uuidv4 } = require("uuid");
const morganBody = require("morgan-body");

// var logger = require("express-logger");
// middleware

const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");
const contactRoutes = require("./routes/contactRoutes.js");
const ambassadorRoutes = require("./routes/ambassadorRoutes.js");
const careersRoutes = require("./routes/careersRoutes.js");
const preOrderRoutes = require("./routes/preOrderRoutes.js");
const productRoutes = require("./routes/productRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
// const authRoutes = require("./routes/authRoutes.js");
const orderRoutes = require("./routes/orderRoutes.js");
const configRoutes = require("./routes/configRoutes.js");
const uploadRoutes = require("./routes/uploadRoutes.js");
// const setupPassport = require("./config/passportSetup.js");
const externalIdRoutes = require("./routes/externalIdRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const cartRoutes = require("./routes/cartRoutes");
const addressRoutes = require("./routes/addressRoutes");
const paymentMethodRoutes = require("./routes/paymentMethodRoutes");
const bodyParser = require("body-parser");
const Order = require("./models/orderModel");
const Subscription = require("./models/subscriptionModel");
const avalaraRoutes = require("./routes/avalaraRoutes");
const orderEmail = require("./utils/orderEmail");
const discountRoutes = require("./routes/discountRoutes");
const calculateTax = require("./middleware/taxMiddleware");
const UserMetaData = require("./models/userMetaModel.js");
const { accessLog, errorLog } = require("./controllers/logController.js");
const AmbassadorMetaData = require("./models/ambassadorMetaModel.js");
const OrderMetaData = require("./models/orderMetaModel.js");
const userMetaAndAmbComUpdate = require("./utils/userMetaAndAmbCom");
const externalIdModel = require("./models/externalId");
const User = require("./models/userModel");
const { upcomingSubscriptionEmail } = require("./utils/subscriptionEmail");
const {
  salesTax,
  calTaxforSecondSubs,
} = require("./middleware/salesOrderTaxMiddleware");
// const reviewRoutes = require("./routes/reviewRoutes.js");
const shippingPriceRoute = require("./routes/shippingAdminRoutes.js");
const cjRoutes = require("./routes/cjRoutes.js");
const govxCode = require("./routes/govxRoutes.js");
// const newsRoutes = require("./routes/newsRoutes.js");
// const carouselRoutes = require("./routes/ambassadorCarouselRoutes.js");
const {
  userTypeOrderMetaCreation,
  shipNowMetaCreation,
  individualOrderMeta,
  subsLineItems,
} = require("./middleware/utilityFunctions");
const shipStation = require("./middleware/shipstationRoute.js");
dotenv.config();
const app = express();

// use morgan in development mode
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// STRIPE WEBHOOK START
const Stripe = new stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    try {
      const sig = request.headers["stripe-signature"];

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          request.body,
          sig,
          endpointSecret
        );
      } catch (err) {
        console.log(err.message);
        console.error;
        response.status(400).send(`Webhook Error: ${err}`);
        return;
      }

      // Handle the event
      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object;
          console.log("line 81------------------", paymentIntent);
          if (paymentIntent.status === "succeeded") {
            if (
              paymentIntent.description !== null &&
              paymentIntent.amount !== 699
            ) {
              const invoiceId = paymentIntent.invoice;

              const invoice = await Stripe.invoices.retrieve(invoiceId);

              const invoiceInfo = await subsLineItems({ invoice });

              const subsId = invoice.subscription;
              const subscriptionRetrieve = await Stripe.subscriptions.retrieve(
                subsId
              );
              // console.log(
              //   "line 94 getData----------",
              //   subscriptionRetrieve.items.data
              // );
              const tectonId = subscriptionRetrieve.metadata.tectonOrderId;

              const tectonSubscriptionId =
                subscriptionRetrieve.metadata.tectonSubscriptionId;

              const order = await Order.find({
                _id: tectonId,
              });

              const subscriptionOrder = await Subscription.find({
                "order.orderItems._id": tectonSubscriptionId,
              });

              // creating order as acc to the order item start
              let newOrderItems;
              // let getTax;
              // let newItemPrice;

              subscriptionOrder[0].order.orderItems.map((value) => {
                if (value._id == tectonSubscriptionId) {
                  newOrderItems = value;
                  // getTax = value.taxPercent;
                  // newItemPrice = value.itemTotalPrice;
                }
              });
              // creating order as acc to the order item end

              // const calDiscPrice =
              //   newItemPrice *
              //   (subscriptionOrder[0].stripeData[0].discount.coupon
              //     .percent_off /
              //     100);

              // const discountedItemsPrice = newItemPrice - calDiscPrice;

              // cal new tax Price

              //fetch tax from avalara strart

              // const createTaxOrder = {
              //   user: subscriptionOrder[0].user,
              //   userType: subscriptionOrder[0].userType,
              //   subsDiscount:
              //     subscriptionOrder[0].stripeData[0].discount.coupon
              //       .percent_off,
              //   order: {
              //     shippingPrice: subscriptionOrder[0].order.shippingPrice,
              //     shippingAddress: subscriptionOrder[0].order.shippingAddress,
              //     orderItems: [newOrderItems],
              //   },
              // };
              // const calTaxPrice = await calTaxforSecondSubs({
              //   order: [createTaxOrder],
              // });
              // let taxPrice = 0;
              // const totalTaxPrice = calTaxPrice.map((items) => {
              //   taxPrice += items.taxCalculated;
              // });
              //fetch tax from avalara end
              ///
              // const newTaxPrice = taxPrice;

              // const toBeCalPrice =
              //   discountedItemsPrice +
              //   newTaxPrice +
              //   subscriptionOrder[0].order.shippingPrice;

              // const newOffPrice = toBeCalPrice;

              // match date to create separate orders start
              const getOrderDate = new Date(order[0].paidAt);
              const getDate = getOrderDate.getDate();
              const getMonth = String(Number(getOrderDate.getMonth()) + 1);
              const getYear = getOrderDate.getFullYear();

              let date = new Date();
              let day = date.getDate();
              let month = date.getMonth() + 1;
              let year = date.getFullYear();

              let fullDate = `${day}.${month}.${year}.`;
              let matchFullDate = `${getDate}.${getMonth}.${getYear}.`;

              // match date to create separate orders end

              if (
                order.length > 0 &&
                matchFullDate !== "NaN.NaN.NaN." &&
                matchFullDate !== fullDate
              ) {
                // For second order on subscription
                if (
                  order[0].isPaid == true &&
                  invoice.metadata.shipNow !== String(true)
                ) {
                  const subscriptionOrder = await Subscription.find({
                    "order.orderItems._id": tectonSubscriptionId,
                  });

                  const newOrder = new Order({
                    shippingAddress: subscriptionOrder[0].order.shippingAddress,
                    billingAddress: subscriptionOrder[0].order.billingAddress,
                    itemsPrice:
                      Math.trunc(invoiceInfo.invoiceItemPrice * 100) / 100,

                    taxPrice: Math.trunc(invoiceInfo.invoiceTax * 100) / 100,

                    // shippingPrice: subscriptionOrder[0].order.shippingPrice,
                    shippingPrice: invoiceInfo.invoiceShipping,
                    totalPrice:
                      Math.trunc(invoiceInfo.totalInvoiceAmount * 100) / 100,

                    orderItems: newOrderItems,
                    userType: subscriptionOrder[0].userType[0],
                    isPaid: true,
                    user: subscriptionOrder[0].user,
                    paymentMethod: "Credit/Debit Card",
                    paidAt: Date.now(),
                    "paymentResult.type": "stripe",
                    "paymentResult.id": paymentIntent.id,
                    "paymentResult.status": paymentIntent.status,
                    "paymentResult.email_address": paymentIntent.receipt_email,
                  });

                  let saveData = await newOrder.save();

                  // creating orderMeta
                  userTypeOrderMetaCreation({
                    orderId: saveData._id,
                    userType: subscriptionOrder[0].userType[0],
                    discountPercent: subscriptionOrder[0].discount,
                    userId: saveData.user,
                  });

                  // commission code start
                  const findUserMetaData = await UserMetaData.find({
                    userId: saveData.user,
                  });

                  if (
                    findUserMetaData.length > 0 &&
                    findUserMetaData[0].ambassador.refCode != undefined
                  ) {
                    const createOrderMeta = new OrderMetaData({
                      orderId: saveData._id,
                      refCode: findUserMetaData[0].ambassador.refCode,
                      discountPercent:
                        subscriptionOrder[0].stripeData[0].discount.coupon
                          .percent_off,
                      ambassadorCommission: saveData.totalPrice * 0.1,
                    });
                    const saveMeta = createOrderMeta.save();
                    userMetaAndAmbComUpdate({ saveData });
                  }

                  // commission code end
                  const updateSubscription = await Subscription.updateOne(
                    {
                      "order.orderItems._id": tectonSubscriptionId,
                    },
                    { $set: { "stripeData.$": subscriptionRetrieve } }
                  );

                  // email code start
                  const email = saveData.shippingAddress.email;
                  const orderId = saveData._id;
                  const orderData = saveData;

                  const subtotal = subscriptionOrder[0].order.itemsPrice;
                  const taxpercent =
                    subscriptionOrder[0].order.orderItems[0].taxPercent;
                  const discountPrice =
                    subtotal * (subscriptionOrder[0].discount / 100);
                  const subtotalAfterDiscount = subtotal - discountPrice;
                  const taxPrice = saveData.taxPrice;
                  const netPrice =
                    subtotalAfterDiscount +
                    taxPrice +
                    subscriptionOrder[0].order.shippingPrice;
                  const shippingPrice =
                    subscriptionOrder[0].order.shippingPrice;

                  const getDate = new Date();

                  upcomingSubscriptionEmail({
                    email,
                    orderId,
                    orderData,
                    getDate,
                    subtotal,
                    shippingPrice,
                    taxPrice,
                    discountPrice,
                    netPrice,
                  });
                  // email code end
                  // External ID code start
                  const collectionID = uuidv4();

                  const getdata = { id: saveData._id, name: "TECTON" };
                  const saveId = new externalIdModel({
                    externalId: getdata,
                    id: collectionID,
                    idType: "ORDER",
                  });
                  const dbID = await saveId.save();
                  // get shipping and tax
                  const shipAndTax = [
                    { shipping: saveData.shippingPrice },
                    { tax: saveData.taxPrice },
                  ];
                  // get discount from order meta
                  const getOrderMeta = await OrderMetaData.findOne({
                    orderId: saveData._id,
                  });
                  const discount = getOrderMeta.discountPercent;
                  saveData = {
                    ...saveData._doc,
                    discountPercent: discount,
                    shipAndTax,
                  };
                  // External ID code end
                  var config = {
                    method: "post",
                    url: process.env.WORKATO_WEBHOOK,
                    headers: {
                      "Content-Type": "application/json",
                    },
                    data: saveData,
                  };
                  axios(config)
                    .then(function (response) {
                      console.log(response.data);
                    })
                    .catch(function (error) {
                      console.log(error.message);
                    });
                } else if (invoice.metadata.shipNow == String(true)) {
                  // ship now order meta creation and commission
                  const data = shipNowMetaCreation({
                    paymentIntent: paymentIntent,
                    orderID: invoice.metadata.tectonOrderId,
                    subscriptionId: invoice.subscription,
                  });
                } else {
                  order[0].isPaid = true;
                  order[0].paidAt = Date.now();
                  order[0].paymentResult = {
                    type: "stripe",
                    id: paymentIntent.id,
                    status: paymentIntent.status,
                    email_address: paymentIntent.receipt_email,
                  };
                  let saveData = await order[0].save();
                  // commission code start
                  const findUserMetaData = await UserMetaData.find({
                    userId: saveData.user,
                  });
                  if (
                    findUserMetaData.length > 0 &&
                    findUserMetaData[0].ambassador.refCode != undefined
                  ) {
                    userMetaAndAmbComUpdate({ saveData });
                  }
                  // commission code end
                  const email = order[0].shippingAddress.email;
                  const orderId = order[0]._id;
                  const orderData = order[0];
                  // External ID code start
                  const collectionID = uuidv4();
                  const getdata = { id: order[0]._id, name: "TECTON" };
                  const saveId = new externalIdModel({
                    externalId: getdata,
                    id: collectionID,
                    idType: "ORDER",
                  });
                  const dbID = await saveId.save();
                  // External ID code end
                  // orderEmail({ email, orderId, orderData });
                  // get shipping and tax
                  const shipAndTax = [
                    { shipping: saveData.shippingPrice },
                    { tax: saveData.taxPrice },
                  ];
                  // get discount from order meta
                  const getOrderMeta = await OrderMetaData.findOne({
                    orderId: saveData._id,
                  });
                  const discount = getOrderMeta.discountPercent;
                  saveData = {
                    ...saveData._doc,
                    discountPercent: discount,
                    shipAndTax,
                  };
                  // External ID code end
                  var config = {
                    method: "post",
                    url: process.env.WORKATO_WEBHOOK,
                    headers: {
                      "Content-Type": "application/json",
                    },
                    data: saveData,
                  };
                  axios(config)
                    .then(function (response) {
                      console.log(response.data);
                    })
                    .catch(function (error) {
                      console.log(error.message);
                    });
                }
              } else {
                order[0].isPaid = true;
                order[0].paidAt = Date.now();
                order[0].paymentResult = {
                  type: "stripe",
                  id: paymentIntent.id,
                  status: paymentIntent.status,
                  email_address: paymentIntent.receipt_email,
                };
                let saveData = await order[0].save();
                // External ID code start
                const collectionID = uuidv4();
                const getdata = { id: order[0]._id, name: "TECTON" };
                const saveId = new externalIdModel({
                  externalId: getdata,
                  id: collectionID,
                  idType: "ORDER",
                });
                const dbID = await saveId.save();
                // External ID code end
                // commission code start
                const findUserMetaData = await UserMetaData.find({
                  userId: saveData.user,
                });

                if (
                  findUserMetaData.length > 0 &&
                  findUserMetaData[0].ambassador.refCode != undefined
                ) {
                  userMetaAndAmbComUpdate({ saveData });
                }
                // commission code end
                const email = order[0].shippingAddress.email;
                const orderId = order[0]._id;
                const orderData = order[0];

                // orderEmail({ email, orderId, orderData });
                // get shipping and tax
                const shipAndTax = [
                  { shipping: saveData.shippingPrice },
                  { tax: saveData.taxPrice },
                ];
                // get discount from order meta
                const getOrderMeta = await OrderMetaData.findOne({
                  orderId: saveData._id,
                });
                const discount = getOrderMeta.discountPercent;
                saveData = {
                  ...saveData._doc,
                  discountPercent: discount,
                  shipAndTax,
                };
                // External ID code end
                var config = {
                  method: "post",
                  url: process.env.WORKATO_WEBHOOK,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  data: saveData,
                };
                await axios(config)
                  .then(function (response) {
                    console.log(response.data);
                  })
                  .catch(function (error) {
                    console.log(error.message);
                  });
              }
            } else {
              const order = await Order.find({
                _id: paymentIntent.metadata.tectonOrderID,
              });
              console.log("127-----------", order);
              if (order.length > 0) {
                order[0].isPaid = true;
                order[0].paidAt = Date.now();
                order[0].paymentResult = {
                  type: "stripe",
                  id: paymentIntent.id,
                  status: paymentIntent.status,
                  email_address: paymentIntent.receipt_email,
                };
                let saveData = await order[0].save();

                // External ID code start
                const collectionID = uuidv4();
                const getdata = { id: order[0]._id, name: "TECTON" };
                const saveId = new externalIdModel({
                  externalId: getdata,
                  id: collectionID,
                  idType: "ORDER",
                });
                const dbID = await saveId.save();
                // External ID code end
                // get user data
                const getuserData = await User.findOne({ _id: order[0].user });

                // user meta update start
                const getUserMetaData = await UserMetaData.find({
                  userId: order[0].user,
                });

                if (
                  order[0].user !== "Guest" &&
                  order[0].userType[0] !== "Guest" &&
                  getuserData.userType[0] !== "Ambassador" &&
                  getuserData.userType[0] !== "Veteran" &&
                  getuserData.userType[0] !== "Employee" &&
                  getuserData.userType[0] !== "Test" &&
                  getUserMetaData.length > 0
                ) {
                  const findUserMetaData = await UserMetaData.find({
                    userId: order[0].user,
                  });

                  const findAmbassadorMeta = await AmbassadorMetaData.find({
                    refCode: findUserMetaData[0].ambassador.refCode,
                  });

                  if (
                    findUserMetaData[0].firstPurchase == true &&
                    findUserMetaData.length > 0
                  ) {
                    const firstOrderDate = new Date();
                    const timeStamp = firstOrderDate.getTime();

                    await UserMetaData.updateOne(
                      { userId: order[0].user },
                      {
                        $set: {
                          firstPurchase: false,
                          "ambassador.referalOrderId": String(order[0]._id),
                          "ambassador.dateOfFirstOrder": String(timeStamp),
                        },
                        $push: { "ambassador.orderIds": String(order[0]._id) },
                      }
                    );

                    // updating ambassador meta start

                    const orderMetaFind = await OrderMetaData.find({
                      orderId: order[0]._id,
                    });

                    const updateCommission =
                      orderMetaFind[0].ambassadorCommission +
                      findAmbassadorMeta[0].commissionedAmount;
                    const updateAmbassadorMeta =
                      await AmbassadorMetaData.updateOne(
                        {
                          refCode: findUserMetaData[0].ambassador.refCode,
                        },
                        {
                          $set: { commissionedAmount: updateCommission },
                          $push: {
                            orderList: {
                              orderId: String(order[0]._id),
                              orderCommission:
                                orderMetaFind[0].ambassadorCommission,
                            },
                          },
                        }
                      );
                    // updating ambassador meta start
                  } else if (
                    findUserMetaData[0].firstPurchase == false &&
                    findUserMetaData.length > 0
                  ) {
                    // const addUnixData = 3153600; //365*24*60*60
                    const addUnixData =
                      94672800000 +
                      Number(findUserMetaData[0].ambassador.dateOfFirstOrder);

                    const oneYearUnixData =
                      31557600000 +
                      Number(findUserMetaData[0].ambassador.dateOfFirstOrder);
                    const matchUnix = new Date();
                    const compareUnix = matchUnix.getTime();

                    if (
                      findAmbassadorMeta[0].ambassadorNo <= 100 &&
                      addUnixData >= compareUnix
                    ) {
                      // updating usermeta data start
                      await UserMetaData.updateOne(
                        { userId: order[0].user },
                        {
                          $push: {
                            "ambassador.orderIds": String(order[0]._id),
                          },
                        }
                      );
                      // updating usermeta data end

                      // updating ambassador meta start

                      const orderMetaFind = await OrderMetaData.find({
                        orderId: order[0]._id,
                      });

                      const updateCommission =
                        orderMetaFind[0].ambassadorCommission +
                        findAmbassadorMeta[0].commissionedAmount;
                      const updateAmbassadorMeta =
                        await AmbassadorMetaData.updateOne(
                          {
                            refCode: findUserMetaData[0].ambassador.refCode,
                          },
                          {
                            $set: { commissionedAmount: updateCommission },
                            $push: {
                              orderList: {
                                orderId: String(order[0]._id),
                                orderCommission:
                                  orderMetaFind[0].ambassadorCommission,
                              },
                            },
                          }
                        );
                      // updating ambassador meta start
                    } else if (
                      findAmbassadorMeta[0].ambassadorNo > 100 &&
                      oneYearUnixData >= compareUnix
                    ) {
                      // updating usermeta data start
                      await UserMetaData.updateOne(
                        { userId: order[0].user },
                        {
                          $push: {
                            "ambassador.orderIds": String(order[0]._id),
                          },
                        }
                      );
                      // updating usermeta data end

                      // updating ambassador meta start

                      const orderMetaFind = await OrderMetaData.find({
                        orderId: order[0]._id,
                      });

                      const updateCommission =
                        orderMetaFind[0].ambassadorCommission +
                        findAmbassadorMeta[0].commissionedAmount;
                      const updateAmbassadorMeta =
                        await AmbassadorMetaData.updateOne(
                          {
                            refCode: findUserMetaData[0].ambassador.refCode,
                          },
                          {
                            $set: { commissionedAmount: updateCommission },
                            $push: {
                              orderList: {
                                orderId: String(order[0]._id),
                                orderCommission:
                                  orderMetaFind[0].ambassadorCommission,
                              },
                            },
                          }
                        );
                      // updating ambassador meta start
                    }
                  }
                }

                // user meta update end

                await individualOrderMeta({ saveData });
                // get shipping and tax

                const shipAndTax = [
                  { shipping: saveData.shippingPrice },
                  { tax: saveData.taxPrice },
                ];

                // get discount from order meta
                const getOrderMeta = await OrderMetaData.findOne({
                  orderId: saveData._id,
                });
                const discount = getOrderMeta.discountPercent;
                saveData = {
                  ...saveData._doc,
                  discountPercent: discount,
                  shipAndTax,
                };

                // External ID code end
                var config = {
                  method: "post",
                  url: process.env.WORKATO_WEBHOOK,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  data: saveData,
                };

                axios(config)
                  .then(function (response) {
                    console.log(response.data);
                  })
                  .catch(function (error) {
                    console.log(error.message);
                  });
              }
              calculateTax({ order });
              const email = order[0].shippingAddress.email;
              const orderId = order[0]._id;
              const orderData = order[0];

              const orderMetaFind = await OrderMetaData.find({
                orderId: order[0]._id,
              });

              // email code
              if (orderMetaFind.length > 0) {
                const discountPercentage = orderMetaFind[0].discountPercent;

                const discountPrice =
                  orderData.itemsPrice * (discountPercentage / 100);
                orderEmail.orderConfirmedEmail({
                  email,
                  orderId,
                  orderData,
                  discountPrice,
                });
              } else {
                orderEmail.orderConfirmedEmailNormalUser({
                  email,
                  orderId,
                  orderData,
                });
              }
            }
          }
          // Then define and call a function to handle the event payment_intent.succeeded
          break;
        // ... handle other event types
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      // Return a 200 response to acknowledge receipt of the event
      response.send();
    } catch (err) {
      console.log(err.message);
      response.status(500).json({ message: err.message });
    }
  }
);
// STRIPE WEBHOOK END

// connect to the mongoDB database
connectDB();
app.use(helmet());
app.use(xss());
app.use(express.json()); // middleware to use req.body
app.use(cors()); // to avoid CORS errors
app.use(compression()); // to use gzip
app.use(bodyParser.json());

// Logger start

// morganBody(app, accessLog);

// morganBody(app, errorLog);
// Logger end

// use cookie sessions

app.use(
  cookieSession({
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    keys: [process.env.COOKIE_SESSION_KEY],
  })
);

// initialise passport middleware to use sessions, and flash messages
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// setup passport
// setupPassport();

// configure all the routes
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);
// app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/config", configRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ambassador", ambassadorRoutes);
app.use("/api/preorder", preOrderRoutes);
app.use("/api/careers", careersRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/v1/externalId", externalIdRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/paymentMethod", paymentMethodRoutes);
app.use("/api/avalara", avalaraRoutes);
app.use("/api/discount", discountRoutes);
app.use("/webhook/shipstation", shipStation);
app.use("/api/shipping", shippingPriceRoute);
app.use("/api/cjintegration", cjRoutes);
app.use("/api/govxcode", govxCode);
// app.use("/api/review", reviewRoutes);
// app.use("/api/news", newsRoutes);
// app.use("/api/carousel", carouselRoutes);
// const __dirname = path.resolve();

// Ping API
app.get("/ping", (req, res) => {
  res.status(200).send("Alive");
});
// To prepare for deployment
if (process.env.NODE_ENV === "development") {
  app.use(express.static(path.join(__dirname, "/frontend/build")));

  app.use("*", (req, res) =>
    res.sendFile(path.resolve(__dirname, "frontend", "build", "index.html"))
  );
}

// middleware to act as fallback for all 404 errors
app.use(notFound);

// configure a custome error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
  )
);
