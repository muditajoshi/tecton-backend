const Subscription = require("../models/subscriptionModel");
const GlobalValuesModel = require("../models/globalValuesModel");
const { v4: uuidv4, stringify } = require("uuid");
const User = require("../models/userModel");
const externalIdModel = require("../models/externalId");
const Stripe = require("stripe");
const ProductIds = require("../models/productIdModel");
const {
  salesTax,
  newSubsTax,
  calTaxforSecondSubs,
} = require("../middleware/salesOrderTaxMiddleware");
const SubscriptionMetaData = require("../models/subscriptionMetaModel");
const Unsubscribe = require("../models/unsubscribeModel");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const UserTypeDiscountModel = require("../models/userTypeDiscountModel");
const UserMetaModel = require("../models/userMetaModel");
const {
  UserTypeSubsDiscount,
  futureSubsDiscount,
} = require("../middleware/userTypeSubsDiscount");
const Orders = require("../models/orderModel");
const {
  subscriptionEmailCancel,
  subscriptionEmailCreated,
  // subscriptionEmailSkip,
  subscriptionSkipped,
  subscriptionEmailUpdated,
  shipNowSubscription,
} = require("../utils/subscriptionEmail");
const { updateTaxSubscription } = require("../middleware/utilityFunctions");
const dotenv = require("dotenv");
const { json } = require("body-parser");
const bodyParser = require("body-parser");
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
exports.subscription = async (req, res) => {
  try {
    const {
      price,
      email,
      firstName,
      lastName,
      newPaymentMethod,
      paymentMethod,
      orderId,
      stripeCustomerId,
      user,
      items,
      orderItems,
      shippingAddress,
      itemsPrice,
      taxPrice,
      shippingPrice,
      billingAddress,
      totalPrice,
      userType,
      refCode,
      discountPercent,
      firstPurchase,
    } = req.body;

    let itemsTotalPrice = 0;

    orderItems.map((items) => {
      itemsTotalPrice += items.qty * items.price;
    });

    const totalSubsPrice = taxPrice + itemsTotalPrice + shippingPrice;

    const subscriptionSave = new Subscription({
      user: user,
      userType: userType,
      order: {
        orderItems: orderItems,
        shippingAddress: shippingAddress,
        billingAddress: billingAddress,
        itemsPrice: itemsTotalPrice.toFixed(2),
        taxPrice: taxPrice,
        shippingPrice: shippingPrice,
        totalPrice: totalSubsPrice.toFixed(2),
      },
    });
    const saveSubscription = await subscriptionSave.save();

    const subscriptionId = String(saveSubscription._id);

    //subsmeta start
    if (refCode) {
      // getAmbData
      const findData = await AmbassadorMetaData.find({ refCode: refCode });

      const ambCommission =
        totalSubsPrice * (findData[0].commissionPercent / 100);

      const subscriptionMeta = await SubscriptionMetaData.create({
        orderId: orderId,
        subscriptionId: subscriptionId,
        refCode: refCode,
        discountPercent: discountPercent,
        ambassadorCommission: Math.trunc(ambCommission * 100) / 100,
      });
    }
    //subsmeta end

    const orderItemsObjId = saveSubscription.order.orderItems;

    let generatedCustomerId;
    let orderItemsarray = [];
    let stripeDataArray;
    let saveStripeData = [];
    let subscription;

    const getTax = await newSubsTax({ order: [saveSubscription] });

    let taxPercent = [];
    let calTax = 0;
    let numberOfIterations = 0;
    getTax.map((items) => {
      if (getTax.length > 2) {
        taxPercent = [...taxPercent, items.tax];
      } else {
        numberOfIterations += 1;
        calTax += items.tax;

        if (numberOfIterations == 2) {
          taxPercent[0] = Number(calTax);
        }
      }
    });

    // taxPercent = (taxPercent * 100).toFixed(2);
    for (let i = 0; i < orderItems.length; i++) {
      if (!stripeCustomerId) {
        if (!generatedCustomerId) {
          const customer = await stripe.customers.create({
            payment_method: paymentMethod,
            email: email,
            invoice_settings: {
              default_payment_method: paymentMethod,
            },
            name: firstName + " " + lastName,
            description: "customer created",
            metadata: { tectonSubscription: subscriptionId },
          });
          generatedCustomerId = customer.id;
        }
        const userInfo = await User.findOne({ _id: user });
        const updatedUserId = await User.updateOne(
          { _id: user },
          { $set: { stripeCustomerId: generatedCustomerId } }
        );

        const findId = await externalIdModel.find({
          externalId: { $elemMatch: { id: user } },
        });
        const getData = { id: generatedCustomerId, name: "STRIPE" };
        if (findId.length > 0) {
          findId[0].externalId = [...findId[0].externalId, getData];
          const data = await findId[0].save();
        }

        // adding tax percentage in orderItems start
        const findSubscriptionObject = await Subscription.find({
          _id: subscriptionId,
        });
        findSubscriptionObject[0].order.orderItems[i].taxPercent =
          taxPercent[i];
        const saveSubs = await findSubscriptionObject[0].save();
        // adding tax percentage in orderItems end

        // avalaratax changes start
        const customerUpdate = await stripe.customers.update(
          generatedCustomerId,
          {
            metadata: {
              Address_PostalCode: shippingAddress.postalCode,
              Address_Country: "US",
              Address_State: shippingAddress.state,
              Address_City: shippingAddress.city,
              Address_Line1: shippingAddress.address,
            },
          }
        );
        // avalaratax changes end

        // check for userTypeDiscount
        const checkDiscount = await UserTypeDiscountModel.find({});
        const { name, frequency } = orderItems[i];
        const findProduct = await ProductIds.find({ productName: name });
        const taxCode = findProduct[0].ids[0].id;
        const itemCodeString = JSON.stringify(findProduct[0]);
        const itemCodeJson = JSON.parse(itemCodeString);
        const itemCode = itemCodeJson.ids[0].itemCode;

        const checkUserMeta = await UserMetaModel.findOne({ userId: user });
        let discountPercent;
        if (checkUserMeta) {
          discountPercent = ambassador.discountPercent;
        }
        if (
          items.length === 1 &&
          items[0].quantity === 1 &&
          shippingPrice > 0
        ) {
          const findShippingProduct = await ProductIds.find({
            productName: "Shipping Price",
          });

          const arrayValue = JSON.stringify(findProduct[0].ids[1]);
          const jsonObj = JSON.parse(arrayValue);

          let getPriceId;

          if (name == findProduct[0].productName) {
            const findFrequency = jsonObj.priceId.map((items) => {
              if (items.frequency == frequency) {
                getPriceId = items.id;
              }
            });
          }
          const getJson = JSON.stringify(findShippingProduct[0].ids[0]);
          const jsonObject = JSON.parse(getJson);
          let findShippingId;

          const findFrequencyShip = jsonObject.priceId.map((items) => {
            if (items.frequency == frequency) {
              findShippingId = items.id;
            }
          });

          if (
            userInfo.userType[0] == "Ambassador" ||
            userInfo.userType[0] == "Veteran" ||
            userInfo.userType[0] == "Employee" ||
            userInfo.userType[0] == "Test"
          ) {
            // To apply different discount coupons on subscription according to their userType
            subscription = await UserTypeSubsDiscount({
              orderItemsObjectId: orderItemsObjId[i]._id,
              orderId,
              stripeCustomerId,
              paymentMethod,
              getPriceId,
              itemsQuantity: items[i].quantity,
              findShippingId,
              userType: userInfo.userType[0],
              taxCode: taxCode,
              itemCode: itemCode,
            });
          }
          // if ambassador refcode exist
          else if (firstPurchase == true && refCode != null) {
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: generatedCustomerId,
              default_payment_method: paymentMethod,
              coupon: "AMBREF" + String(discountPercent),
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [
                { price: getPriceId, quantity: items[i].quantity },
                { price: findShippingId, quantity: 1 },
              ],
              proration_behavior: "none",
            });
          } else {
            // if ambassador refcode doesn't exist
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: generatedCustomerId,
              default_payment_method: paymentMethod,
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [
                { price: getPriceId, quantity: items[i].quantity },
                { price: findShippingId, quantity: 1 },
              ],
              proration_behavior: "none",
            });
          }
        } else {
          if (
            userInfo.userType[0] == "Ambassador" ||
            userInfo.userType[0] == "Veteran" ||
            userInfo.userType[0] == "Employee" ||
            userInfo.userType[0] == "Test"
          ) {
            // To apply different discount coupons on subscription according to their userType
            subscription = await UserTypeSubsDiscount({
              orderItemsObjectId: orderItemsObjId[i]._id,
              orderId,
              stripeCustomerId,
              paymentMethod,
              getPriceId,
              itemsQuantity: items[i].quantity,
              findShippingId: null,
              userType: userInfo.userType[0],
              taxCode: taxCode,
              itemCode: itemCode,
            });
          }
          // if ambassador refcode exist
          else if (firstPurchase == true && refCode != null) {
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: generatedCustomerId,
              default_payment_method: paymentMethod,
              coupon: "AMBREF" + String(discountPercent),
              pay_immediately: false,
              proration_behavior: "none",
              expand: ["latest_invoice.payment_intent"],
              items: [{ price: items[i].price, quantity: items[i].quantity }],
            });
          } else {
            // if ambassador refcode doesn't exist
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: generatedCustomerId,
              default_payment_method: paymentMethod,
              pay_immediately: false,
              proration_behavior: "none",
              expand: ["latest_invoice.payment_intent"],
              items: [{ price: items[i].price, quantity: items[i].quantity }],
            });
          }
        }

        // adding shipping in subscription if there is only one item # CODE START
        if (
          items.length === 1 &&
          items[0].quantity === 1 &&
          shippingPrice == 0
        ) {
          const findFrequency =
            subscription.items.data[0].plan.interval_count +
            " " +
            subscription.items.data[0].plan.interval +
            "s";
          const findShippingPrice = await ProductIds.find({
            productName: "Shipping Price",
          });
          const shippingPriceStringify = JSON.stringify(findShippingPrice);
          const jsonObj = JSON.parse(shippingPriceStringify);
          let shippingPriceId;
          const getShippingPrice = jsonObj[0].ids[0].priceId.map((items) => {
            if (items.frequency == findFrequency) {
              shippingPriceId = items.id;
            }
          });

          const createShippingItem = await stripe.subscriptionItems.create({
            subscription: subscription.id,
            proration_behavior: "none",
            price: shippingPriceId,
            quantity: 1,
          });
        }
        // adding shipping in subscription if there is only one item # CODE END

        if (
          userInfo.userType[0] == "Ambassador" ||
          userInfo.userType[0] == "Veteran" ||
          userInfo.userType[0] == "Employee" ||
          userInfo.userType[0] == "Test"
        ) {
          // function from userTypeDiscount.js
          const updatedSubs = await futureSubsDiscount({
            userId: user,
            subscriptionId: subscription.id,
            quantity: items[i].quantity,
            userType: userInfo.userType[0],
          });
          console.log(updatedSubs);
        } else {
          if (items[i].quantity === 1) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY1 }
            );
          } else if (items[i].quantity === 2) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY2 }
            );
          } else if (items[i].quantity === 3) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY3 }
            );
          } else if (items[i].quantity >= 4) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY4 }
            );
          }
        }
        const subscriptionRetrieve = await stripe.subscriptions.retrieve(
          subscription.id
        );

        // finalizing the invoice
        // setTimeout(async () => {
        //   const getInvoiceId = subscription.latest_invoice.id;
        //   const invoiceFinalize = await stripe.invoices.finalizeInvoice(
        //     getInvoiceId
        //   );
        //   const invoice = await stripe.invoices.pay(getInvoiceId);
        // }, 1000);

        // finalizing the invoice

        saveStripeData = [...saveStripeData, subscriptionRetrieve];
        const saveSubscriptionData = await Subscription.updateOne(
          {
            _id: subscriptionId,
          },
          { $set: { stripeData: saveStripeData } }
        );
        const findSubsDataById = await Subscription.findById({
          _id: subscriptionId,
        });
        // External ID code start
        const collectionID = uuidv4();
        const getdata = [
          { id: findSubsDataById._id, name: "TECTON" },
          { id: findSubsDataById.stripeData[i].id, name: "STRIPE" },
        ];
        const saveId = new externalIdModel({
          externalId: getdata,
          id: collectionID,
          idType: "SUBSCRIPTION",
        });
        const dbID = await saveId.save();
        // External ID code end
        stripeDataArray = saveStripeData;
      } else {
        const attachPaymentToCustomer = await stripe.paymentMethods.attach(
          paymentMethod,
          { customer: stripeCustomerId }
        );

        // const updateCustomer = await stripe.customers.update(stripeCustomerId, {
        //   invoice_settings: { default_payment_method: paymentMethod },
        // });
        const { name, frequency } = orderItems[i];

        const findProduct = await ProductIds.find({ productName: name });
        const itemCodeString = JSON.stringify(findProduct[0]);
        const itemCodeJson = JSON.parse(itemCodeString);
        const itemCode = itemCodeJson.ids[0].itemCode;
        const taxCode = findProduct[0].ids[0].id;
        const arrayValue = JSON.stringify(findProduct[0].ids[1]);
        const jsonObj = JSON.parse(arrayValue);

        let getPriceId;
        if (name == findProduct[0].productName) {
          const findFrequency = jsonObj.priceId.map((items) => {
            if (items.frequency == frequency) {
              getPriceId = items.id;
            }
          });
        }

        const customer = await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod,
          },
        });

        // adding tax percentage in orderItems start
        const findSubscriptionObject = await Subscription.find({
          _id: subscriptionId,
        });

        findSubscriptionObject[0].order.orderItems[i].taxPercent = Number(
          taxPercent[i]
        );
        const saveSubs = await findSubscriptionObject[0].save();
        // adding tax percentage in orderItems end

        // avalaratax changes start
        const customerUpdate = await stripe.customers.update(stripeCustomerId, {
          metadata: {
            Address_PostalCode: shippingAddress.postalCode,
            Address_Country: "US",
            Address_State: shippingAddress.state,
            Address_City: shippingAddress.city,
            Address_Line1: shippingAddress.address,
          },
        });
        // avalaratax changes end

        // check for userTypeDiscount
        const checkDiscount = await UserTypeDiscountModel.find({});
        const checkUserMeta = await UserMetaModel.findOne({ userId: user });
        const userInfo = await User.findOne({ _id: user });

        let discountPercent;
        if (checkUserMeta && checkUserMeta.ambassador.refCode !== null) {
          discountPercent = checkUserMeta.ambassador.discountPercent;
        }

        if (
          items.length === 1 &&
          items[0].quantity === 1 &&
          shippingPrice > 0
        ) {
          const findShippingProduct = await ProductIds.find({
            productName: "Shipping Price",
          });

          const getJson = JSON.stringify(findShippingProduct[0].ids[0]);
          const jsonObject = JSON.parse(getJson);
          let findShippingId;

          const findFrequencyShip = jsonObject.priceId.map((items) => {
            if (items.frequency == frequency) {
              findShippingId = items.id;
            }
          });

          if (
            userInfo.userType[0] == "Ambassador" ||
            userInfo.userType[0] == "Veteran" ||
            userInfo.userType[0] == "Employee" ||
            userInfo.userType[0] == "Test"
          ) {
            // To apply different discount coupons on subscription according to their userType
            subscription = await UserTypeSubsDiscount({
              orderItemsObjectId: orderItemsObjId[i]._id,
              orderId,
              stripeCustomerId,
              paymentMethod,
              getPriceId,
              itemsQuantity: items[i].quantity,
              findShippingId,
              userType: userInfo.userType[0],
              taxCode: taxCode,
              itemCode: itemCode,
            });
          } // if ambassador refcode exist
          else if (firstPurchase == true && refCode != null) {
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                //
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: stripeCustomerId,
              proration_behavior: "none",
              default_payment_method: paymentMethod,
              coupon: "AMBREF" + String(discountPercent),
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [
                { price: getPriceId, quantity: items[i].quantity },
                { price: findShippingId, quantity: 1 },
              ],
            });
          } else {
            // if ambassador refcode doesn't exist
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
              },
              customer: stripeCustomerId,
              proration_behavior: "none",
              default_payment_method: paymentMethod,
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [
                { price: getPriceId, quantity: items[i].quantity },
                { price: findShippingId, quantity: 1 },
              ],
            });
          }
        } else {
          if (
            userInfo.userType[0] == "Ambassador" ||
            userInfo.userType[0] == "Veteran" ||
            userInfo.userType[0] == "Employee" ||
            userInfo.userType[0] == "Test"
          ) {
            // To apply different discount coupons on subscription according to their userType
            subscription = await UserTypeSubsDiscount({
              orderItemsObjectId: orderItemsObjId[i]._id,
              orderId,
              stripeCustomerId,
              paymentMethod,
              getPriceId,
              itemsQuantity: items[i].quantity,
              findShippingId: null,
              userType: userInfo.userType[0],
              taxCode: taxCode,
              itemCode: itemCode,
            });
          }
          // if ambassador refcode exist
          else if (firstPurchase == true && refCode != null) {
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: stripeCustomerId,
              coupon: "AMBREF" + String(discountPercent),
              proration_behavior: "none",
              default_payment_method: paymentMethod,
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [{ price: getPriceId, quantity: items[i].quantity }],
            });
          } else {
            // if ambassador refcode doesn't exist
            subscription = await stripe.subscriptions.create({
              metadata: {
                tectonSubscriptionId: String(orderItemsObjId[i]._id),
                tectonOrderId: orderId,
                // TaxCode: taxCode,
                // ItemCode: itemCode,
              },
              customer: stripeCustomerId,
              proration_behavior: "none",
              default_payment_method: paymentMethod,
              pay_immediately: false,
              expand: ["latest_invoice.payment_intent"],
              items: [{ price: getPriceId, quantity: items[i].quantity }],
            });
          }
        }
        // adding shipping in subscription if there is only one item # CODE START
        if (
          items.length === 1 &&
          items[0].quantity === 1 &&
          shippingPrice == 0
        ) {
          const findFrequency =
            subscription.items.data[0].plan.interval_count +
            " " +
            subscription.items.data[0].plan.interval +
            "s";
          const findShippingPrice = await ProductIds.find({
            productName: "Shipping Price",
          });
          const shippingPriceStringify = JSON.stringify(findShippingPrice);
          const jsonObj = JSON.parse(shippingPriceStringify);
          let shippingPriceId;
          const getShippingPrice = jsonObj[0].ids[0].priceId.map((items) => {
            if (items.frequency == findFrequency) {
              shippingPriceId = items.id;
            }
          });

          const createShippingItem = await stripe.subscriptionItems.create({
            subscription: subscription.id,
            proration_behavior: "none",
            price: shippingPriceId,
            quantity: 1,
          });
        }
        // adding shipping in subscription if there is only one item # CODE END

        // updating the coupon for the subscription from 2nd order
        let subscriptionRetrieve;
        if (
          userInfo.userType[0] == "Ambassador" ||
          userInfo.userType[0] == "Veteran" ||
          userInfo.userType[0] == "Employee" ||
          userInfo.userType[0] == "Test"
        ) {
          // function from userTypeDiscount.js
          const updatedSubs = await futureSubsDiscount({
            userId: user,
            subscriptionId: subscription.id,
            quantity: items[i].quantity,
            userType: userInfo.userType[0],
          });
        } else {
          if (items[i].quantity === 1) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY1 }
            );
          } else if (items[i].quantity === 2) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY2 }
            );
          } else if (items[i].quantity === 3) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY3 }
            );
          } else if (items[i].quantity >= 4) {
            const subscriptionUpdate = await stripe.subscriptions.update(
              subscription.id,
              { coupon: process.env.QTY4 }
            );
          }
        }
        subscriptionRetrieve = await stripe.subscriptions.retrieve(
          subscription.id
        );
        // // finalizing the invoice
        // setTimeout(async () => {
        //   const getInvoiceId = subscription.latest_invoice.id;

        //   const invoiceFinalize = await stripe.invoices.finalizeInvoice(
        //     getInvoiceId
        //   );
        //   const invoice = await stripe.invoices.pay(getInvoiceId);
        // }, 1000);

        // // finalizing the invoice

        saveStripeData = [...saveStripeData, subscriptionRetrieve];

        const saveSubscriptionData = await Subscription.updateOne(
          {
            _id: subscriptionId,
          },
          { $set: { stripeData: saveStripeData } }
        );

        const findSubsDataById = await Subscription.findById({
          _id: subscriptionId,
        });
        // External ID code start
        const collectionID = uuidv4();
        const getdata = [
          { id: findSubsDataById._id, name: "TECTON" },
          { id: findSubsDataById.stripeData[i].id, name: "STRIPE" },
        ];
        const saveId = new externalIdModel({
          externalId: getdata,
          id: collectionID,
          idType: "SUBSCRIPTION",
        });
        const dbID = await saveId.save();
        // External ID code end
        stripeDataArray = saveStripeData;
      }
    }
    const getSubsData = await Subscription.findById({ _id: subscriptionId });
    const saveDiscount = await Subscription.updateOne(
      { _id: subscriptionId },
      {
        $set: {
          discount: getSubsData.stripeData[0].discount.coupon.percent_off,
        },
      }
    );

    // email code for subscription
    const userTypes = await getSubsData.userType[0];

    let useTypediscountPercent;

    switch (userTypes) {
      case "Individual":
        await UserTypeDiscountModel.findOne(
          { "ambassadorReferral.userType": "AmbassadorReferral" },
          (err, result) => {
            if (err) throw err;
            useTypediscountPercent = result.ambassadorReferral.discountPercent;
          }
        );
        break;
      case "Ambassador":
        await UserTypeDiscountModel.findOne(
          { "ambassador.userType": "Ambassador" },
          (err, result) => {
            if (err) throw err;
            useTypediscountPercent = result.ambassador.discountPercent;
          }
        );
        break;
      case "Veteran":
        await UserTypeDiscountModel.findOne(
          { "veteran.userType": "Veteran" },
          (err, result) => {
            if (err) throw err;
            useTypediscountPercent = result.veteran.discountPercent;
          }
        );
        break;
      case "Employee":
        await UserTypeDiscountModel.findOne(
          { "employee.userType": "Employee" },
          (err, result) => {
            if (err) throw err;
            useTypediscountPercent = result.employee.discountPercent;
          }
        );
        break;

      case "Test":
        await UserTypeDiscountModel.findOne(
          { "test.userType": "Test" },
          (err, result) => {
            if (err) throw err;
            useTypediscountPercent = result.employee.discountPercent;
          }
        );
        break;
      default:
        useTypediscountPercent = 0;
    }

    if (userTypes === "Individual" && !firstPurchase === true) {
      useTypediscountPercent = 0;
    }

    const updateTaxInfo = await updateTaxSubscription({
      subscriptionId: subscriptionId,
    });
    console.log(updateTaxInfo);

    setTimeout(async () => {
      const newgetSubsData = await Subscription.findById({
        _id: subscriptionId,
      });
      const getId = newgetSubsData._id;
      const getDate = newgetSubsData.createdAt;
      const getTotalPrice = newgetSubsData.order.totalPrice;
      const orderData = newgetSubsData.order.orderItems;
      const completeOrder = newgetSubsData.order;

      const subTotal = newgetSubsData.order.itemsPrice;
      const discount = useTypediscountPercent;
      const discountPrice = subTotal * (discount / 100);
      const subtotalAfterDiscount = subTotal - discountPrice;
      const taxAmount = taxPercent.reduce((sum, item) => sum + item, 0);
      calTax = calTax ? calTax : taxAmount;
      const netTotal =
        subtotalAfterDiscount + calTax + newgetSubsData.order.shippingPrice;

      //Reccuring total
      const upComingDiscount = newgetSubsData.discount;
      const upComingDiscountPrice = subTotal * (upComingDiscount / 100);
      const upComingSubtotalAfterDiscount = subTotal - upComingDiscountPrice;

      const upcomingTaxPrice = newgetSubsData.order.orderItems.reduce(
        (sum, item) => sum + item.taxPercent,
        0
      );

      const recurringTotal =
        upComingSubtotalAfterDiscount +
        upcomingTaxPrice +
        newgetSubsData.order.shippingPrice;

      subscriptionEmailCreated({
        email,
        firstName,
        lastName,
        getId,
        getDate,
        getTotalPrice,
        orderData,
        completeOrder,
        netTotal,
        calTax,
        recurringTotal,
        discountPrice,
      });
    }, 1000);

    res.status(200).json({
      subscription: stripeDataArray,
      message: "Subscription Created",
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.getSubsByUserId = async (req, res) => {
  try {
    const allSubscriptions = await Subscription.find({
      user: req.user._id,
    }).sort("-createdAt");
    res.json(allSubscriptions);
  } catch (err) {
    res.status(400).json(err.message);
  }
};
exports.getAllSubs = async (req, res) => {
  try {
    const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination
    const pageSize = 200; // total number of entries on a single page

    const count = await Subscription.countDocuments({}); // total number of documents available

    // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
    // and limiting the number of documents included in this request
    // sort this in desc order that the document was created at
    const subscription = await Subscription.find({})
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort("-createdAt");

    // send the list of orders, current page number, total number of pages available
    res.json({
      subscription,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const id = req.params.id;
    const { reason, message, email, phoneNo, firstName, lastName } = req.body;
    const removeFromStripe = await stripe.subscriptions.del(id);
    const getPriceId = removeFromStripe.items.data[0].price.id;

    const removeOrderItem = await Subscription.updateOne(
      {
        "stripeData.id": id,
      },
      {
        $set: {
          "order.orderItems.$": null,
        },
      }
    );

    const removeOrderItemNull = await Subscription.updateOne(
      {
        "stripeData.id": id,
      },
      {
        $pull: {
          "order.orderItems": null,
        },
      }
    );
    const subsData = await Subscription.find({ "stripeData.id": id });
    const firstNameShippingAddress =
      subsData[0].order.shippingAddress.firstName;
    const lastNameShippingAddress = subsData[0].order.shippingAddress.lastName;
    if (subsData[0].stripeData.length > 1) {
      const removeSubscription = await Subscription.updateOne(
        { "stripeData.id": id },
        { $pull: { stripeData: { id: id } } }
      );
    } else {
      const removeSubscription = await Subscription.deleteOne({
        "stripeData.id": id,
      });
    }
    const removedSubs = new Unsubscribe({
      subscription: removeFromStripe,
      reason: reason,
      message: message,
      email: email,
      firstName: firstName,
      lastName: lastName,
      phoneNo: phoneNo,
    });
    const saveData = await removedSubs.save();
    // External ID code start
    const collectionID = uuidv4();
    const getdata = [
      { id: saveData._id, name: "TECTON" },
      { id: removeFromStripe.id, name: "STRIPE" },
    ];
    const saveId = new externalIdModel({
      externalId: getdata,
      id: collectionID,
      idType: "UNSUBSCRIBE",
    });
    const dbID = await saveId.save();
    // External ID code end
    subscriptionEmailCancel({
      email,
      id,
      firstNameShippingAddress,
      lastNameShippingAddress,
    });
    res.status(204).json({ messsage: "Subscription Cancelled Successfully" });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.updateSubscriptionQuantity = async (req, res) => {
  try {
    const { id, stripeSubscriptionId, qty, stripeItemId } = req.body;
    const subsRetrieve = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );
    const findData = await Subscription.find({
      "stripeData.id": stripeSubscriptionId,
    });

    if (findData[0].order.orderItems.length > 1) {
      const subscriptionItem = await stripe.subscriptionItems.update(
        stripeItemId,
        { quantity: qty, proration_behavior: "none" }
      );
    } else {
      if (
        qty > 1 &&
        findData[0].order.orderItems.length == 1 &&
        findData[0].order.orderItems[0].qty > 1
      ) {
        const subscriptionItem = await stripe.subscriptionItems.update(
          stripeItemId,
          { quantity: qty, proration_behavior: "none" }
        );
      } else if (qty > 1 && findData[0].order.orderItems.length == 1) {
        const subscriptionItem = await stripe.subscriptionItems.update(
          stripeItemId,
          { quantity: qty, proration_behavior: "none" }
        );
        const shippingItemId = subsRetrieve.items.data[1].id;
        const deleted = await stripe.subscriptionItems.del(shippingItemId, {
          proration_behavior: "none",
        });
      } else if (qty == 1 && findData[0].order.orderItems.length == 1) {
        const subscriptionItem = await stripe.subscriptionItems.update(
          stripeItemId,
          { quantity: qty, proration_behavior: "none" }
        );
        const findFrequency =
          subsRetrieve.items.data[0].plan.interval_count +
          " " +
          subsRetrieve.items.data[0].plan.interval +
          "s";
        const findShippingPrice = await ProductIds.find({
          productName: "Shipping Price",
        });
        const shippingPriceStringify = JSON.stringify(findShippingPrice);
        const jsonObj = JSON.parse(shippingPriceStringify);
        let shippingPriceId;
        const getShippingPrice = jsonObj[0].ids[0].priceId.map((items) => {
          if (items.frequency == findFrequency) {
            shippingPriceId = items.id;
          }
        });
        const createShippingItem = await stripe.subscriptionItems.create({
          subscription: stripeSubscriptionId,
          proration_behavior: "none",
          price: shippingPriceId,
          quantity: 1,
        });
      }
    }
    // const subscriptionItem = await stripe.subscriptionItems.update(
    //   stripeItemId,
    //   { quantity: qty }
    // );
    const subscriptionRetrieve = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );
    const updatedItem = subscriptionRetrieve;
    const updatedData = await Subscription.updateOne(
      { "stripeData.id": stripeSubscriptionId },
      { $set: { "stripeData.$": updatedItem } }
    );
    const getPrice = updatedItem.items.data[0].price.unit_amount / 100;
    const updateOrderItem = await Subscription.updateOne(
      {
        "stripeData.id": stripeSubscriptionId,
      },
      {
        $set: {
          "order.orderItems.$.qty": qty,
          "order.orderItems.$.itemTotalPrice": qty * getPrice,
        },
      }
    );
    const findSubs = await Subscription.find({
      "stripeData.id": stripeSubscriptionId,
    });

    // updating items price start
    let newItemsPrice = 0;
    findSubs[0].order.orderItems.map((items) => {
      newItemsPrice += items.itemTotalPrice;
    });

    const fetchShippingPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });

    if (newItemsPrice > 88.83) {
      newShippingPrice = 0;
    } else {
      newShippingPrice = fetchShippingPrice.utility.price;
    }

    // calculate tax price after updating the quantity
    let valueIndex = 0;
    let addValue = 0;
    const getIndex = findData[0].stripeData.map((items) => {
      if (items.id == stripeSubscriptionId) {
        valueIndex = addValue;
      }
      addValue += 1;
    });

    const createOrderForTax = {
      subsDiscount: findSubs[0].discount,
      user: findSubs[0].user,
      userType: findSubs[0].userType,
      order: {
        orderItems: [findSubs[0].order.orderItems[valueIndex]],
        shippingAddress: findSubs[0].order.shippingAddress,
        shippingPrice: newShippingPrice,
      },
    };

    const calTax = await newSubsTax({ order: [createOrderForTax] });

    let newTax = 0;
    for (let i = 0; i < calTax.length; i++) {
      newTax += calTax[i].tax;
    }

    findSubs[0].order.orderItems[valueIndex].taxPercent = newTax;
    // calculate tax price after updating the quantity

    // Adding tax amount from all the order items in the subscription
    let updatedTaxPrice = 0;
    findSubs[0].order.orderItems.map((items) => {
      updatedTaxPrice += items.taxPercent;
    });
    const newTaxPrice = updatedTaxPrice;
    const subTotalPrice =
      Number(newTaxPrice) + Number(newItemsPrice) + Number(newShippingPrice);
    const discountPrice = (
      (newItemsPrice / 100) *
      findSubs[0].discount
    ).toFixed(2);
    const totalPrice = (subTotalPrice - discountPrice).toFixed(2);
    findSubs[0].order.itemsPrice = newItemsPrice;
    findSubs[0].order.shippingPrice = newShippingPrice;
    findSubs[0].order.taxPrice = newTaxPrice;
    findSubs[0].order.totalPrice = totalPrice;
    await findSubs[0].save();
    // updating items price end
    const getData = await Subscription.find({
      "stripeData.id": stripeSubscriptionId,
    });
    const email = getData[0].order.shippingAddress.email;
    const firstName = getData[0].order.shippingAddress.firstName;
    const lastName = getData[0].order.shippingAddress.lastName;

    const orderData = getData[0].order.orderItems[valueIndex];
    const date = subscriptionRetrieve.current_period_end;
    const getDate = new Date(date * 1000);
    const getId = orderData._id;
    const updatedQty = req.body.qty;
    const totalOrderValue = getData[0].order.totalPrice;

    //item Price Calculation

    const itemPrice = orderData.itemTotalPrice;
    const itemTax = orderData.taxPercent;
    const itemShipping = getData[0].order.shippingPrice;
    const itemDiscount = getData[0].discount;
    const itemPriceAfterDiscount = itemPrice - (itemPrice * itemDiscount) / 100;
    const itemTotalPrice =
      itemPriceAfterDiscount + itemTax + (itemShipping ? itemShipping : 0);

    subscriptionEmailUpdated({
      email,
      getId,
      firstName,
      lastName,
      getDate,
      getId,
      orderData,
      updatedQty,
      totalOrderValue,
      itemTotalPrice,
    });
    res.status(200).json({
      subscription: getData,
      messsage: "Updated successfully",
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.updateSubscriptionFrequency = async (req, res) => {
  try {
    const {
      id,
      priceId,
      stripeSubscriptionId,
      stripeItemId,
      shippingItemId,
      frequency,
    } = req.body;

    let quantity;
    if (shippingItemId) {
      const retrieveSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );
      quantity = retrieveSubscription.quantity;

      const getShippingPriceId = await ProductIds.find({
        productName: "Shipping Price",
      });
      const stringifyData = JSON.stringify(getShippingPriceId);
      const jsonObject = JSON.parse(stringifyData);

      let shippingPrice;
      const mapData = jsonObject[0].ids[0].priceId.map((items) => {
        if (items.frequency == frequency) {
          shippingPrice = items.id;
        }
      });
      if (retrieveSubscription.trial_end !== null) {
        const subscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            proration_behavior: "none",
            items: [
              { id: stripeItemId, price: priceId },
              { id: shippingItemId, price: shippingPrice },
            ],
          }
        );
      } else {
        const subscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            proration_behavior: "none",
            pay_immediately: false,
            items: [
              { id: stripeItemId, price: priceId },
              { id: shippingItemId, price: shippingPrice },
            ],
          }
        );
        const getInvoiceId = subscription.latest_invoice;

        const invoiceFinalize = await stripe.invoices.finalizeInvoice(
          getInvoiceId
        );
        const invoice = await stripe.invoices.voidInvoice(getInvoiceId);
      }
    } else {
      const retrieveSubscription = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      quantity = retrieveSubscription.quantity;

      if (retrieveSubscription.trial_end !== null) {
        const subscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            proration_behavior: "none",
            items: [{ id: stripeItemId, price: priceId }],
          }
        );
      } else {
        const subscription = await stripe.subscriptions.update(
          stripeSubscriptionId,
          {
            proration_behavior: "none",
            pay_immediately: false,
            items: [{ id: stripeItemId, price: priceId }],
          }
        );
        const getInvoiceId = subscription.latest_invoice;
        const invoiceFinalize = await stripe.invoices.finalizeInvoice(
          getInvoiceId
        );
        const invoice = await stripe.invoices.voidInvoice(getInvoiceId);
      }
    }
    // Updating the quantity after changing the frequency
    if (quantity !== null) {
      const updatingQuantity = await stripe.subscriptionItems.update(
        stripeItemId,
        { quantity: quantity, proration_behavior: "none" }
      );
    }

    setTimeout(async () => {
      const subscriptionRetrieve = await stripe.subscriptions.retrieve(
        stripeSubscriptionId
      );

      const updatedItem = subscriptionRetrieve;
      const updatedFreq =
        updatedItem.items.data[0].plan.interval_count +
        " " +
        updatedItem.items.data[0].plan.interval;
      const updateOrderItem = await Subscription.updateOne(
        {
          "stripeData.id": stripeSubscriptionId,
        },
        {
          $set: {
            "order.orderItems.$.frequency":
              updatedItem.items.data[0].plan.interval_count +
              " " +
              updatedItem.items.data[0].plan.interval,
            "order.orderItems.$.stripePriceId.interval":
              updatedItem.items.data[0].plan.interval_count +
              " " +
              updatedItem.items.data[0].plan.interval,
            "order.orderItems.$.stripePriceId.id":
              updatedItem.items.data[0].price.id,
          },
        }
      );

      const updatedData = await Subscription.updateOne(
        { "stripeData.id": stripeSubscriptionId },
        { $set: { "stripeData.$": updatedItem } }
      );

      const getData = await Subscription.find({
        "stripeData.id": stripeSubscriptionId,
      });

      let valueIndex = 0;
      let addValue = 0;
      const getIndex = getData[0].stripeData.map((items) => {
        if (items.id == stripeSubscriptionId) {
          valueIndex = addValue;
        }
        addValue += 1;
      });

      console.log("valueIndex", valueIndex);

      const email = getData[0].order.shippingAddress.email;
      const firstName = getData[0].order.shippingAddress.firstName;
      const lastName = getData[0].order.shippingAddress.lastName;

      const orderData = getData[0].order.orderItems[valueIndex];
      const date = subscriptionRetrieve.current_period_end;
      const getDate = new Date(date * 1000);
      const getId = orderData._id;
      const updatedQty = orderData.qty;
      const totalOrderValue = getData[0].order.totalPrice;

      //item Price Calculation

      const itemPrice = orderData.itemTotalPrice;
      const itemTax = orderData.taxPercent;
      const itemShipping = getData[0].order.shippingPrice;
      const itemDiscount = getData[0].discount;
      const itemPriceAfterDiscount =
        itemPrice - (itemPrice * itemDiscount) / 100;
      const itemTotalPrice =
        itemPriceAfterDiscount + itemTax + (itemShipping ? itemShipping : 0);

      subscriptionEmailUpdated({
        email,
        getId,
        firstName,
        lastName,
        getDate,
        getId,
        getDate,
        orderData,
        updatedFreq,
        totalOrderValue,
        itemTotalPrice,
        updatedQty,
      });

      res.status(200).json({
        subscription: getData,
        messsage: "Updated successfully",
      });
      console.log("Delayed for 5 second.");
    }, "5000");
  } catch (err) {
    console.log(err.message);
    res.status(400).json(err.message);
  }
};

exports.updateShippingBillingAdd = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, id } = req.body;

    const order = await Subscription.find({ _id: id });

    if (shippingAddress && billingAddress) {
      try {
        const updateAddress = await Subscription.updateOne(
          { _id: id },
          {
            $set: {
              "order.shippingAddress": shippingAddress,
              "order.billingAddress": billingAddress,
            },
          }
        );

        const updatedData = await Subscription.findById({ _id: id });
        // new tax amount code
        let getTax;
        let taxArray = [];
        if (updatedData.order.orderItems.length > 1) {
          for (let i = 0; i < updatedData.order.orderItems.length; i++) {
            const createOrderObject = {
              user: updatedData.user,
              userType: updatedData.userType,
              subsDiscount: updatedData.discount,
              order: {
                shippingAddress: updatedData.order.shippingAddress,
                shippingPrice: updatedData.order.shippingPrice,
                orderItems: [updatedData.order.orderItems[i]],
              },
            };
            getTax = await salesTax({ order: [createOrderObject] });
            let taxCalculated = 0;

            getTax.map((items) => {
              taxCalculated += items.taxCalculated;
            });
            taxArray = [...taxArray, taxCalculated.toFixed(2)];
          }
        } else {
          const createOrderObject = {
            user: updatedData.user,
            userType: updatedData.userType,
            subsDiscount: updatedData.discount,
            order: {
              shippingAddress: updatedData.order.shippingAddress,
              shippingPrice: updatedData.order.shippingPrice,
              orderItems: updatedData.order.orderItems,
            },
          };
          getTax = await salesTax({ order: [createOrderObject] });

          let taxCalculated = 0;

          getTax.map((items) => {
            taxCalculated += items.taxCalculated;
          });
          taxArray = [...taxArray, taxCalculated.toFixed(2)];
        }
        // console.log(updatedData);

        let sumOfTaxArray = 0;
        for (let i = 0; i < updatedData.order.orderItems.length; i++) {
          updatedData.order.orderItems[i].taxPercent = taxArray[i];
          sumOfTaxArray += Number(taxArray[i]);
        }
        const saveTax = await updatedData.save();
        const getDiscount =
          updatedData.stripeData[0].discount.coupon.percent_off;
        //updating the tax, total price start
        const calculateTaxPrice = sumOfTaxArray;

        const discountedTotalPrice =
          (updatedData.order.itemsPrice * getDiscount) / 100;

        const totalPrice =
          calculateTaxPrice +
          updatedData.order.itemsPrice +
          updatedData.order.shippingPrice;

        const updatedTotalPrice = totalPrice - discountedTotalPrice;

        const saveData = await Subscription.updateOne(
          { _id: id },
          {
            $set: {
              "order.totalPrice": updatedTotalPrice.toFixed(2),
              "order.taxPrice": calculateTaxPrice.toFixed(2),
            },
          }
        );
        //updating the tax, total price end

        const stripeCustomerId = updatedData.stripeData[0].customer;

        // // avalaratax changes start
        const customerUpdate = await stripe.customers.update(stripeCustomerId, {
          metadata: {
            Address_PostalCode: shippingAddress.postalCode,
            Address_Country: "US",
            Address_State: shippingAddress.state,
            Address_City: shippingAddress.city,
            Address_Line1: shippingAddress.address,
          },
        });
        // // avalaratax changes end

        const getData = await Subscription.findById({ _id: id });

        const email = getData.order.shippingAddress.email;
        const firstName = getData.order.shippingAddress.firstName;
        const lastName = getData.order.shippingAddress.lastName;
        const getId = getData._id;
        const date = subscriptionRetrieve.current_period_end;
        const getDate = new Date(date * 1000);
        const totalOrderValue = getData.order.totalPrice;
        const productArray = getData.order.orderItems.map(
          (items) => items.name
        );

        subscriptionEmailUpdated({
          email,
          firstName,
          lastName,
          getId,
          getDate,
          totalOrderValue,
          productArray,
        });
        res.status(200).json({
          subscription: getData,
          message: "updated successfully",
        });
      } catch (err) {
        res.status(400).json({ err: err.message });
      }
    } else if (shippingAddress) {
      try {
        const updateAddress = await Subscription.updateOne(
          { _id: id },
          {
            $set: {
              "order.shippingAddress": shippingAddress,
            },
          }
        );
        const updatedData = await Subscription.findById({ _id: id });
        // new tax amount code
        let getTax;
        let taxArray = [];
        if (updatedData.order.orderItems.length > 1) {
          for (let i = 0; i < updatedData.order.orderItems.length; i++) {
            const createOrderObject = {
              user: updatedData.user,
              userType: updatedData.userType,
              subsDiscount: updatedData.discount,
              order: {
                shippingAddress: updatedData.order.shippingAddress,
                shippingPrice: updatedData.order.shippingPrice,
                orderItems: [updatedData.order.orderItems[i]],
              },
            };
            getTax = await salesTax({ order: [createOrderObject] });
            let taxCalculated = 0;

            getTax.map((items) => {
              taxCalculated += items.taxCalculated;
            });
            taxArray = [...taxArray, taxCalculated.toFixed(2)];
          }
        } else {
          const createOrderObject = {
            user: updatedData.user,
            userType: updatedData.userType,
            subsDiscount: updatedData.discount,
            order: {
              shippingAddress: updatedData.order.shippingAddress,
              shippingPrice: updatedData.order.shippingPrice,
              orderItems: updatedData.order.orderItems,
            },
          };
          getTax = await salesTax({ order: [createOrderObject] });

          let taxCalculated = 0;

          getTax.map((items) => {
            taxCalculated += items.taxCalculated;
          });
          taxArray = [...taxArray, taxCalculated.toFixed(2)];
        }
        // console.log(updatedData);

        let sumOfTaxArray = 0;
        for (let i = 0; i < updatedData.order.orderItems.length; i++) {
          updatedData.order.orderItems[i].taxPercent = taxArray[i];
          sumOfTaxArray += Number(taxArray[i]);
        }
        const saveTax = await updatedData.save();
        const getDiscount =
          updatedData.stripeData[0].discount.coupon.percent_off;
        //updating the tax, total price start
        const calculateTaxPrice = sumOfTaxArray;

        const discountedTotalPrice =
          (updatedData.order.itemsPrice * getDiscount) / 100;

        const totalPrice =
          calculateTaxPrice +
          updatedData.order.itemsPrice +
          updatedData.order.shippingPrice;

        const updatedTotalPrice = totalPrice - discountedTotalPrice;

        const saveData = await Subscription.updateOne(
          { _id: id },
          {
            $set: {
              "order.totalPrice": updatedTotalPrice.toFixed(2),
              "order.taxPrice": calculateTaxPrice.toFixed(2),
            },
          }
        );
        //updating the tax, total price end

        const stripeCustomerId = updatedData.stripeData[0].customer;

        // // stripe customer meta update start
        const customerUpdate = await stripe.customers.update(stripeCustomerId, {
          metadata: {
            Address_PostalCode: shippingAddress.postalCode,
            Address_Country: "US",
            Address_State: shippingAddress.state,
            Address_City: shippingAddress.city,
            Address_Line1: shippingAddress.address,
          },
        });
        // // stripe customer meta update end

        const getData = await Subscription.findById({ _id: id });

        const email = getData.order.shippingAddress.email;
        const firstName = getData.order.shippingAddress.firstName;
        const lastName = getData.order.shippingAddress.lastName;
        const getId = getData._id;
        const date = new Date();
        const getDate = new Date(date * 1000);
        const totalOrderValue = getData.order.totalPrice;
        const productArray = getData.order.orderItems.map(
          (items) => items.name
        );

        subscriptionEmailUpdated({
          email,
          firstName,
          lastName,
          getId,
          getDate,
          totalOrderValue,
          productArray,
        });
        res.status(200).json({
          subscription: getData,
          message: "updated successfully",
        });
      } catch (err) {
        res.status(400).json({ err: err.message });
      }
    } else if (billingAddress) {
      const updateAddress = await Subscription.updateOne(
        { _id: id },
        {
          $set: {
            "order.billingAddress": billingAddress,
          },
        }
      );
      const getData = await Subscription.findById({ _id: id });

      const email = getData.order.shippingAddress.email;
      const firstName = getData.order.shippingAddress.firstName;
      const lastName = getData.order.shippingAddress.lastName;
      const getId = getData._id;
      const date = new Date();
      const getDate = new Date(date * 1000);
      const totalOrderValue = getData.order.totalPrice;
      const productArray = getData.order.orderItems.map((items) => items.name);

      subscriptionEmailUpdated({
        email,
        firstName,
        lastName,
        getId,
        getDate,
        totalOrderValue,
        productArray,
      });
      res
        .status(200)
        .json({ subscription: getData, message: "updated successfully" });
    } else {
      res.status(400).json({ message: "null request" });
    }
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.getSubsById = async (req, res) => {
  try {
    const id = req.params.id;
    const getData = await Subscription.findById({ _id: id });
    const { firstName, lastName, email } = getData.order.shippingAddress;
    res.status(200).json({
      _id: getData._id,
      user: getData.user,
      orderItems: [
        getData.order.orderItems,
        getData.order.shippingAddress,
        getData.order.billingAddress,
        getData.stripeData,
      ],
      itemsPrice: getData.order.itemsPrice,
      shippingPrice: getData.order.shippingPrice,
      totalPrice: getData.order.totalPrice,
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.getUnsubscribeAll = async (req, res) => {
  try {
    const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination
    const pageSize = 200; // total number of entries on a single page

    const count = await Unsubscribe.countDocuments({}); // total number of documents available

    // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
    // and limiting the number of documents included in this request
    // sort this in desc order that the document was created at
    const unsubscribe = await Unsubscribe.find({})
      .limit(pageSize)
      .skip(pageSize * (page - 1))
      .sort("-createdAt");

    // send the list of orders, current page number, total number of pages available
    res.json({
      unsubscribe,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.skipOrder = async (req, res) => {
  try {
    const id = req.params.id;

    const subsRetrieve = await stripe.subscriptions.retrieve(id);

    const endDate = subsRetrieve.current_period_end;

    const getDataShipping = await Subscription.find({ "stripeData.id": id });

    const shippingPriceId =
      getDataShipping[0].order.orderItems[0].shippingPriceId;

    let newDate = 0;

    const frequency =
      String(subsRetrieve.items.data[0].plan.interval_count) +
      " " +
      subsRetrieve.items.data[0].plan.interval;

    if (frequency == "2 week") {
      newDate = endDate + 1209600; //14*24*60*60;
    } else if (frequency == "4 week") {
      newDate = endDate + 2419200; //28*24*60*60;
    } else if (frequency == "6 week") {
      newDate = endDate + 3628800; //42*24*60*60;
    }

    if (shippingPriceId) {
      const removeFromStripe = await stripe.subscriptions.update(
        shippingPriceId,

        { pause_collection: { behavior: "void", resumes_at: newDate } }
      );
    }

    const subscription = await stripe.subscriptions.update(
      id,

      { pause_collection: { behavior: "void", resumes_at: newDate } }
    );

    const unixDate = subscription.pause_collection.resumes_at;

    const pauseDate = new Date(unixDate * 1000).toLocaleString();

    const saveData = await Subscription.updateOne(
      {
        "stripeData.id": subscription.id,
      },

      {
        $set: {
          "stripeData.$": subscription,

          "order.orderItems.$.nextBillingDate": pauseDate,
        },
      }
    );

    const getData = await Subscription.find({ "stripeData.id": id });

    let valueIndex = 0;
    let addValue = 0;
    const getIndex = getData[0].stripeData.map((items) => {
      if (items.id == id) {
        valueIndex = addValue;
      }
      addValue += 1;
    });

    const email = getData[0].order.shippingAddress.email;
    const firstName = getData[0].order.shippingAddress.firstName;
    const lastName = getData[0].order.shippingAddress.lastName;
    const orderData = getData[0].order.orderItems[valueIndex];
    const getDate = getData[0].createdAt;
    const getId = getData[0]._id;
    const netTotal = getData[0].order.totalPrice;
    subscriptionSkipped({
      email,
      firstName,
      lastName,
      getId,
      getDate,
      pauseDate,
      orderData,
      netTotal,
    });

    res.status(200).json({
      subscription: getData,

      message: "Skipped Order Subscription",
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.shipNow = async (req, res) => {
  try {
    const stripeSubscriptionId = req.params.id;

    const subscription = await stripe.subscriptions.update(
      stripeSubscriptionId,

      {
        billing_cycle_anchor: "now",

        proration_behavior: "none",

        pay_immediately: false,
      }
    );

    const subscriptionRetrieve = await stripe.subscriptions.retrieve(
      stripeSubscriptionId
    );
    const tectonSubscriptionId =
      subscriptionRetrieve.metadata.tectonSubscriptionId;

    // creating order start
    if (subscription) {
      const fetchSubscription = await Subscription.find({
        "stripeData.id": stripeSubscriptionId,
      });

      let valueIndex = 0;
      let addValue = 0;
      const getIndex = fetchSubscription[0].stripeData.map((items) => {
        if (items.id == stripeSubscriptionId) {
          valueIndex = addValue;
        }
        addValue += 1;
      });
      const fetchOrderItem = fetchSubscription[0].order.orderItems[valueIndex];
      const { shippingAddress, billingAddress } = fetchSubscription[0].order;

      let shippingPrice = fetchSubscription[0].order.shippingPrice;

      const itemsPrice = fetchOrderItem.itemTotalPrice;

      const order = {
        user: fetchSubscription[0].user,
        userType: fetchSubscription[0].userType,
        subsDiscount: fetchSubscription[0].discount,
        order: {
          shippingPrice: shippingPrice,
          shippingAddress: shippingAddress,
          orderItems: [fetchOrderItem],
        },
      };
      const calTaxPrice = await calTaxforSecondSubs({ order: [order] });
      let taxPrice = 0;
      const totalTaxPrice = calTaxPrice.map((items) => {
        taxPrice += items.taxCalculated;
      });

      const subTotalPrice =
        Number(taxPrice) + Number(itemsPrice) + Number(shippingPrice);
      const discountPrice = (
        Number(itemsPrice) *
        (fetchSubscription[0].discount / 100)
      ).toFixed(2);
      const totalPrice = (subTotalPrice - discountPrice).toFixed(2);
      const newOrder = new Orders({
        shippingAddress: shippingAddress,
        billingAddress: billingAddress,
        orderItems: fetchOrderItem,
        itemsPrice: itemsPrice,
        taxPrice: taxPrice,
        shippingPrice: shippingPrice,
        totalPrice: totalPrice,
        paymentMethod: "Credit/Debit Card",
        user: fetchSubscription[0].user,
      });
      var saveData = await newOrder.save();
    }

    const invoice = await stripe.invoices.update(
      subscriptionRetrieve.latest_invoice,
      { metadata: { tectonOrderId: String(saveData._id), shipNow: true } }
    );

    // creating order end

    const updateSubscription = await Subscription.updateOne(
      {
        "order.orderItems._id": tectonSubscriptionId,
      },

      { $set: { "stripeData.$": subscriptionRetrieve } }
    );

    const getData = await Subscription.find({
      "stripeData.id": stripeSubscriptionId,
    });
    const email = saveData.shippingAddress.email;
    const firstName = saveData.shippingAddress.firstName;
    const lastName = saveData.shippingAddress.lastName;
    const orderData = saveData;

    const getId = saveData._id;
    const subtotal = saveData.itemsPrice;
    // const taxpercent = getData[0].order.orderItems[0].taxPercent;
    // const discountPrice =
    //   subtotal * (getData[0].stripeData[0].discount.coupon.percent_off / 100);
    // const subtotalAfterDiscount = subtotal - discountPrice;
    // const taxPrice =
    //   (subtotalAfterDiscount + getData[0].order.shippingPrice) *
    //   (taxpercent / 100);
    const netTotal = saveData.totalPrice;

    const getDate = new Date();

    shipNowSubscription({
      email,
      firstName,
      lastName,
      getId,
      getDate,
      orderData,
      netTotal,
    });
    res.status(200).json({
      message: "subscription shipped now successfully",
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};

exports.modifyShipment = async (req, res) => {
  try {
    const id = req.params.id;

    const resumeDate = req.body.resumeDate; // date format MM-DD-YYYY

    const date = new Date(resumeDate);

    let skipDate = date.getTime() / 1000 + 86400;
    const subsRetrieve = await stripe.subscriptions.retrieve(id);

    const getDataShipping = await Subscription.find({ "stripeData.id": id });

    const subscription = await stripe.subscriptions.update(id, {
      proration_behavior: "none",

      trial_end: skipDate,
    });

    const unixDate = skipDate;
    const pauseDate = new Date(unixDate * 1000).toLocaleString();

    const saveData = await Subscription.updateOne(
      {
        "stripeData.id": subscription.id,
      },

      {
        $set: {
          "stripeData.$": subscription,

          "order.orderItems.$.nextBillingDate": pauseDate,
        },
      }
    );

    const getData = await Subscription.find({ "stripeData.id": id });
    const subscriptionRetrieve = await stripe.subscriptions.retrieve(id);
    const newdate = subscriptionRetrieve.current_period_end;
    const getDate = new Date(newdate * 1000);

    let valueIndex = 0;
    let addValue = 0;
    const getIndex = getData[0].stripeData.map((items) => {
      if (items.id == id) {
        valueIndex = addValue;
      }
      addValue += 1;
    });

    const email = getData[0].order.shippingAddress.email;
    const firstName = getData[0].order.shippingAddress.firstName;
    const lastName = getData[0].order.shippingAddress.lastName;
    const orderData = getData[0].order.orderItems[valueIndex];
    const getId = orderData._id;
    const totalOrderValue = getData[0].order.totalPrice;

    //item Price Calculation

    const itemPrice = orderData.itemTotalPrice;
    const taxPercent = orderData.taxPercent;
    const itemShipping = getData[0].order.shippingPrice;
    const itemDiscount = getData[0].discount;
    const itemPriceAfterDiscount = itemPrice - (itemPrice * itemDiscount) / 100;

    const itemTotalPrice =
      itemPriceAfterDiscount + taxPercent + (itemShipping ? itemShipping : 0);

    subscriptionEmailUpdated({
      email,
      firstName,
      lastName,
      getId,
      getDate,
      orderData,
      totalOrderValue,
      itemTotalPrice,
    });

    res.status(200).json({
      subscription: getData,

      message: "subscription modified successfully",
    });
  } catch (err) {
    res.status(400).json(err.message);
  }
};
