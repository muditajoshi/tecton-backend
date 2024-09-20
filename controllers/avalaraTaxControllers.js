var Avatax = require("avatax");
const axios = require("axios");
const dotenv = require("dotenv");
const DiscountModel = require("../models/discountModel");
const ProductIdModel = require("../models/productIdModel");
const OrderMetaData = require("../models/orderMetaModel.js");
const User = require("../models/userModel");
const UserMetaModel = require("../models/userMetaModel");
const AmbassadorMeta = require("../models/ambassadorMetaModel");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
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

exports.calculateTax = async (req, res) => {
  try {
    const lineItems = req.body.lineItems;
    const couponCode = req.body.couponCode;
    const shippingAddress = req.body.shippingAddress;
    const tectonCustomerId = req.body.id;
    const shippingPrice = req.body.shippingPrice;
    let discountPercent = 0;

    // To check the discount from the coupon code
    if (couponCode) {
      const coupon = await DiscountModel.find({
        couponCode: couponCode,
      });

      discountPercent = coupon[0].discountPercentage;
    }

    let itemsPrice = 0;
    const addPrice = req.body.lineItems.map((value) => {
      itemsPrice += value.itemTotalPrice;
    });

    const getUserData = await User.find({ _id: req.body.id });
    console.log("getUserData", getUserData);
    // to calculate the discount percent according to user type
    // to be sent in the tax document to avalara
    if (getUserData.length > 0) {
      const userMetaData = await UserMetaModel.find({
        userId: getUserData[0]._id,
      });

      const ambassadorMeta = await AmbassadorMetaData.find({
        userId: getUserData[0]._id,
      });

      if (userMetaData.length > 0 || ambassadorMeta.length > 0) {
        const userType = getUserData[0].userType[0];

        if (
          (userType == "Individual" && userMetaData[0].firstPurchase == true) ||
          userType == [""]
        ) {
          const getPercent =
            userMetaData[0].ambassador.discountPercent + discountPercent;

          discountPercent = itemsPrice * (getPercent / 100);
        } else if (userType == "Employee") {
          const getPercent = userMetaData[0].employee.discountPercentOrder;

          discountPercent = itemsPrice * (getPercent / 100);
        } else if (userType == "Veteran") {
          const getPercent = userMetaData[0].veteran.discountPercentOrder;
          discountPercent = itemsPrice * (getPercent / 100);
        } else if (userType == "Test") {
          const getPercent = userMetaData[0].test.discountPercentOrder;
          discountPercent = itemsPrice * (getPercent / 100);
        } else if (userType == "Ambassador") {
          const findAmbMeta = await AmbassadorMeta.find({
            userId: req.body.id,
          });
          const getPercent = findAmbMeta[0].discountPercent;
          discountPercent = itemsPrice * (getPercent / 100);
        } else if (couponCode) {
          const coupon = await DiscountModel.find({
            couponCode: couponCode,
          });
          discountPercent = itemsPrice * (coupon[0].discountPercentage / 100);
        } else {
          discountPercent = 0;
        }
      } else {
        if (couponCode) {
          const coupon = await DiscountModel.find({
            couponCode: couponCode,
          });
          discountPercent = itemsPrice * (coupon[0].discountPercentage / 100);
        } else {
          discountPercent = 0;
        }
      }
    } else {
      if (couponCode) {
        const coupon = await DiscountModel.find({
          couponCode: couponCode,
        });
        discountPercent = itemsPrice * (coupon[0].discountPercentage / 100);
      } else {
        discountPercent = 0;
      }
    }
    const fetchShippingPrice = await GlobalValuesModel.findOne({
      "utility.utilityType": "Shipping Price",
    });

    let shippingTax;
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
        discounted: "true",
        quantity: quantity,
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
      type: "SalesOrder",
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
      currencyCode: "USD",
    };

    // console.log(taxDocument);

    client
      .createTransaction({ model: taxDocument })
      .then((result) => {
        // response tax document
        res.status(200).json({ data: result.summary });
      })
      .catch(function (err) {
        res.status(400).json({ message: err.message });
      });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

exports.createCustomerAvalara = async (req, res) => {
  var data = req.body.customerData;

  var configuration = {
    method: "post",
    url: "https://sandbox-rest.avatax.com/api/v2/companies/7814916/customers",
    headers: {
      Authorization: "Basic cmFqYXQuc2hhcm1hQHMzYmdsb2JhbC5jb206U3RhckAxMjM0",
      "Content-Type": "application/json",
    },
    data: data,
  };

  axios(configuration)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
      res.status(200).json({ data: response.data });
    })
    .catch(function (error) {
      res.status(400).json({ err: error.message });
    });
};
