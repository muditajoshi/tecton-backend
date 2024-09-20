const OrderMeta = require("../models/orderMetaModel");
const UserMetaData = require("../models/userMetaModel");
const Subscription = require("../models/subscriptionModel");
const axios = require("axios");
const externalIdModel = require("../models/externalId");
const { newSubsTax } = require("../middleware/salesOrderTaxMiddleware");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/orderModel");
const userMetaAndAmbComUpdate = require("../utils/userMetaAndAmbCom");
const GlobalValuesModel = require("../models/globalValuesModel");
const ProductId = require("../models/productIdModel");

// The following function creates an OrderMeta object with provided orderId and discountPercent for specified userType.
const userTypeOrderMetaCreation = async ({
  orderId,
  discountPercent,
  userType,
  userId,
}) => {
  try {
    // If the userType is "Ambassador", "Employee", "Test" or "Veteran"
    const getMetaUser = await UserMetaData.find({ userId: userId });
    if (
      userType == "Ambassador" ||
      userType == "Employee" ||
      userType == "Test" ||
      userType == "Veteran" ||
      (userType == "Individual" && getMetaUser.length == 0)
    ) {
      // Create an OrderMeta object with the provided orderId and discountPercent
      const createOrderMeta = new OrderMeta({
        orderId: orderId,
        discountPercent: discountPercent,
      });
      // Save the created object to a database
      const saveData = await createOrderMeta.save();
    }
  } catch (error) {
    console.log(error.message);
  }
};

const shipNowMetaCreation = async ({
  orderID,
  paymentIntent,
  subscriptionId,
}) => {
  try {
    const order = await Order.find({ _id: orderID });
    order[0].isPaid = true;
    order[0].paidAt = Date.now();
    order[0].paymentResult = {
      type: "stripe",
      id: paymentIntent.id,
      status: paymentIntent.status,
      email_address: paymentIntent.receipt_email,
    };
    let saveData = await order[0].save();

    // orderMeta creation
    const retrieveSubs = await Subscription.find({
      "stripeData.id": subscriptionId,
    });
    const discount = retrieveSubs[0].discount;
    const userType = retrieveSubs[0].userType[0];
    const userMeta = await UserMetaData.find({ userId: retrieveSubs[0].user });
    if (
      userType == "Ambassador" ||
      userType == "Employee" ||
      userType == "Test" ||
      userType == "Veteran" ||
      (userType == "Individual" && userMeta.length == 0)
    ) {
      userTypeOrderMetaCreation({
        orderId: orderID,
        discountPercent: discount,
        userType: userType,
        userId: retrieveSubs[0].user,
      });
    } else if (
      userMeta.length > 0 &&
      userMeta[0].ambassador.refCode != undefined
    ) {
      const createOrderMeta = new OrderMeta({
        orderId: orderID,
        refCode: userMeta[0].ambassador.refCode,
        discountPercent: discount,
        ambassadorCommission: saveData.totalPrice * 0.1,
      });
      const saveMeta = createOrderMeta.save();
      userMetaAndAmbComUpdate({ saveData });
    }

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
    const discountPer = getOrderMeta.discountPercent;
    saveData = {
      ...saveData._doc,
      discountPercent: discountPer,
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
  } catch (error) {
    console.log(error.message);
  }
};

// updating tax after the subscription is created with the discounted amount
const updateTaxSubscription = async ({ subscriptionId }) => {
  try {
    const getData = await Subscription.findById({ _id: subscriptionId });

    let shippingPriceNewTax = 0;
    const fetchShippingPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });
    if (
      getData.order.orderItems.length > 1 ||
      getData.order.orderItems[0].qty > 1
    ) {
      shippingPriceNewTax = 0;
    } else {
      shippingPriceNewTax = fetchShippingPrice.utility.price;
    }
    const createOrderForTax = {
      subsDiscount: getData.discount,
      order: {
        orderItems: getData.order.orderItems,
        shippingAddress: getData.order.shippingAddress,
        shippingPrice: shippingPriceNewTax,
      },
      user: getData.user,
      userType: getData.userType,
    };

    const createTax = await newSubsTax({ order: [createOrderForTax] });

    let taxPercentUpdated = [];
    let calTaxUpdated = 0;
    let numberOfIterationsUpdated = 0;
    createTax.map((items) => {
      if (createTax.length > 2) {
        taxPercentUpdated = [...taxPercentUpdated, items.tax];
      } else {
        numberOfIterationsUpdated += 1;
        calTaxUpdated += items.tax;

        if (numberOfIterationsUpdated == 2) {
          taxPercentUpdated[0] = Number(calTaxUpdated);
        }
      }
    });

    const discountPrice = getData.order.itemsPrice * (getData.discount / 100);
    const newItemsPrice = getData.order.itemsPrice - discountPrice;
    let addTaxPrice = 0;
    for (let i = 0; i < getData.order.orderItems.length; i++) {
      addTaxPrice += taxPercentUpdated[i];
      getData.order.orderItems[i].taxPercent = taxPercentUpdated[i];
    }
    getData.order.taxPrice = addTaxPrice.toFixed(2);
    getData.order.shippingPrice = shippingPriceNewTax;
    getData.order.totalPrice = (
      shippingPriceNewTax +
      newItemsPrice +
      addTaxPrice
    ).toFixed(2);
    const saveData = getData.save();
    return "success";
  } catch (error) {
    return error.message;
  }

  // updating tax after the subscription is created
};

// orderMetaCreation for individual and guest users with no discount
const individualOrderMeta = async ({ saveData }) => {
  try {
    const getOrderMeta = await OrderMeta.findOne({
      orderId: saveData._id,
    });
    if (!getOrderMeta) {
      const createOrderMeta = new OrderMeta({
        orderId: saveData._id,
        discountPercent: 0,
      });
      const saveOrderMeta = await createOrderMeta.save();
    }
  } catch (error) {
    return error.message;
  }
};

// create order data from stripe invoice(only for subscriptions)
const subsLineItems = async ({ invoice }) => {
  try {
    const getLength = invoice.lines.data.length;

    let totalInvoiceAmount, invoiceItemPrice, invoiceTax, invoiceShipping;
    // with shipping
    if (getLength == 3) {
      invoice.lines.data.map((res) => {
        let desc = res.description.split(" ");
        if (res.description == "Sales Tax calculated by AvaTax") {
          invoiceTax = res.amount / 100;
        } else if (desc[2] == "SHIPPING") {
          invoiceShipping = res.amount / 100;
        } else {
          invoiceItemPrice = res.amount / 100;
        }
      });
    } else if (getLength == 2) {
      // without shipping
      invoiceShipping = 0;
      invoice.lines.data.map((res) => {
        let desc = res.description.split(" ");
        if (res.description == "Sales Tax calculated by AvaTax") {
          invoiceTax = res.amount / 100;
        } else {
          invoiceItemPrice = res.amount / 100;
        }
      });
    }
    totalInvoiceAmount = invoice.amount_paid / 100;
    return {
      totalInvoiceAmount: totalInvoiceAmount,
      invoiceItemPrice: invoiceItemPrice,
      invoiceTax: invoiceTax,
      invoiceShipping: invoiceShipping,
    };
  } catch (error) {
    return error.message;
  }
};

// Export the above function as an object
module.exports = {
  userTypeOrderMetaCreation,
  shipNowMetaCreation,
  updateTaxSubscription,
  individualOrderMeta,
  subsLineItems,
};
