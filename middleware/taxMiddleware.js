var Avatax = require("avatax");
const axios = require("axios");
const dotenv = require("dotenv");
const DiscountModel = require("../models/discountModel");
const ProductIdModel = require("../models/productIdModel");
const OrderMetaData = require("../models/orderMetaModel.js");
const GlobalValuesModel = require("../models/globalValuesModel");
dotenv.config();
const config = {
  appName: process.env.AVALARA_APP_NAME,
  appVersion: process.env.AVALARA_APP_VERSION,
  environment: process.env.AVALARA_ENVIRONMENT,
  machineName: process.env.AVALARA_MACHINE_NAME,
};

const creds = {
  username: process.env.AVALARA_USER_NAME,
  password: process.env.AVALARA_PASSWORD,
};

var client = new Avatax(config).withSecurity(creds);

const calculateTax = async ({ order }) => {
  try {
    const useData = order[0];
    const lineItems = useData.orderItems;
    const shippingAddress = useData.shippingAddress;
    const tectonCustomerId = useData.user;
    const shippingPrice = useData.shippingPrice;
    let itemsPrice = 0;
    const addPrice = lineItems.map((value) => {
      itemsPrice += value.itemTotalPrice;
    });
    let discountPercent = 0;

    const getOrderMetaData = await OrderMetaData.find({ orderId: useData._id });
    if (getOrderMetaData.length > 0) {
      const getPercent = getOrderMetaData[0].discountPercent;
      discountPercent = itemsPrice * (getPercent / 100);
    } else {
      discountPercent = 0;
    }
    let shippingTax;
    const fetchShippingPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });
    if (shippingPrice == 0) {
      shippingTax = {
        amount: 0,
        taxCode: "FR000000",
        description: "Shipping",
        itemCode: "107",
        discounted: "false",
      };
    } else {
      shippingTax = {
        amount: fetchShippingPrice.utility.price,
        taxCode: "FR000000",
        description: "Shipping",
        itemCode: "107",
        discounted: "false",
      };
    }
    let line = [];
    for (i = 0; i < lineItems.length; i++) {
      const getIdAvalara = await ProductIdModel.find({
        productName: lineItems[i].name,
      });
      const id = getIdAvalara[0].ids[0].id;
      const convert = JSON.stringify(getIdAvalara);

      const itemCodeObject = JSON.parse(convert);
      const itemCode = itemCodeObject[0].ids[0].itemCode;
      const description = getIdAvalara[0].ids[0].itemDescription;
      const amount = lineItems[i].price * lineItems[i].qty;
      const quantity = lineItems[i].qty;
      const putData = {
        amount: amount,
        taxCode: id,
        description: description,
        itemCode: itemCode,
        quantity: quantity,
        discounted: "true",
      };
      line = [...line, putData];
    }
    line = [...line, shippingTax];
    let customerCode;
    if (!tectonCustomerId) {
      customerCode = shippingAddress.email;
    } else {
      customerCode = shippingAddress.email;
    }

    const getDate = new Date().toLocaleString().split(",")[0].split("/");
    const dateNow =
      getDate[process.env.TAX_DATE_FORMAT1] +
      "-" +
      getDate[process.env.TAX_DATE_FORMAT2] +
      "-" +
      getDate[process.env.TAX_DATE_FORMAT3];
    const taxDocument = {
      type: "SalesInvoice",
      companyCode: "DEFAULT",
      date: dateNow,
      customerCode: customerCode,
      discount: String(discountPercent),
      purchaseOrderNo: dateNow,
      addresses: {
        shipFrom: {
          line1: "200 County Road 3690",
          city: "Wynne",
          region: "Arkansas",
          country: "US",
          postalCode: "73296-8205",
        },
        shipTo: {
          line1: shippingAddress.address,
          city: shippingAddress.city,
          region: shippingAddress.state,
          country: "US",
          postalCode: shippingAddress.postalCode,
        },
      },
      lines: line,
      commit: true,
      currencyCode: "USD",
    };
    console.log(taxDocument);
    client
      .createTransaction({ model: taxDocument })
      .then((result) => {
        // response tax document

        console.log(result.summary);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  } catch (err) {
    console.log(err.message);
  }
};

module.exports = calculateTax;
