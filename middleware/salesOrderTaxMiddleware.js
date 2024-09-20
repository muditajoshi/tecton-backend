var Avatax = require("avatax");
const axios = require("axios");
const dotenv = require("dotenv");
const ProductIdModel = require("../models/productIdModel");
const UserMetaModel = require("../models/userMetaModel");
const AmbassadorMeta = require("../models/ambassadorMetaModel");
const GlobalValuesModel = require("../models/globalValuesModel");
//
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

const salesTax = async ({ order }) => {
  try {
    const useData = order[0];

    const subsDiscount = useData.subsDiscount;

    const lineItems = useData.order.orderItems;
    const shippingAddress = useData.order.shippingAddress;
    const tectonCustomerId = useData.user;
    const shippingPrice = useData.order.shippingPrice;

    let discountPercent = 0;
    let itemsPrice = 0;
    const addPrice = lineItems.map((value) => {
      itemsPrice += value.itemTotalPrice;
    });

    const userMetaData = await UserMetaModel.find({
      userId: tectonCustomerId,
    });

    if (useData.userType[0] == "Ambassador") {
      var ambMeta = await AmbassadorMeta.find({ userId: tectonCustomerId });
    } else {
      ambMeta = [];
    }
    if (userMetaData.length > 0 || ambMeta.length > 0) {
      const userType = useData.userType[0];
      if (
        (userType == "Individual" && userMetaData[0].firstPurchase == true) ||
        userType == [""]
      ) {
        const getPercent = userMetaData[0].ambassador.discountPercent;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Employee") {
        const getPercent = userMetaData[0].employee.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Veteran") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Test") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Ambassador") {
        const findAmbMeta = await AmbassadorMeta.find({
          userId: tectonCustomerId,
        });
        const getPercent = findAmbMeta[0].discountPercent;

        discountPercent = itemsPrice * (getPercent / 100);
      } else {
        discountPercent = 0;
      }
    } else {
      discountPercent = 0;
    }

    if (useData.userType[0] == "Individual" && subsDiscount) {
      discountPercent = (itemsPrice * subsDiscount) / 100;
    } else if (useData.userType[0] == "Guest" && subsDiscount) {
      discountPercent = (itemsPrice * subsDiscount) / 100;
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
      commit: true,
      currencyCode: "USD",
    };

    const taxData = await client
      .createTransaction({ model: taxDocument })
      .then((result) => {
        // response tax document

        // console.log("160", result);
        return result.summary;
      })
      .catch(function (err) {
        console.log(err);
        return err.message;
      });
    return taxData;
  } catch (err) {
    console.log(err.message);
  }
};

const newSubsTax = async ({ order }) => {
  try {
    const useData = order[0];
    const subsDiscount = useData.subsDiscount;
    const lineItems = useData.order.orderItems;
    const shippingAddress = useData.order.shippingAddress;
    const tectonCustomerId = useData.user;
    const shippingPrice = useData.order.shippingPrice;

    let discountPercent = 0;
    let itemsPrice = 0;

    const addPrice = lineItems.map((value) => {
      itemsPrice += value.itemTotalPrice;
    });

    const userMetaData = await UserMetaModel.find({
      userId: tectonCustomerId,
    });
    if (useData.userType[0] == "Ambassador") {
      var ambMeta = await AmbassadorMeta.find({ userId: tectonCustomerId });
    } else {
      ambMeta = [];
    }
    if (userMetaData.length > 0 || ambMeta.length > 0) {
      const userType = useData.userType[0];
      if (
        (userType == "Individual" && userMetaData[0].firstPurchase == true) ||
        userType == [""]
      ) {
        const getPercent = userMetaData[0].ambassador.discountPercent;

        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Employee") {
        const getPercent = userMetaData[0].employee.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Veteran") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Test") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Ambassador") {
        const findAmbMeta = await AmbassadorMeta.find({
          userId: tectonCustomerId,
        });
        const getPercent = findAmbMeta[0].discountPercent;
        discountPercent = itemsPrice * (getPercent / 100);
      } else {
        discountPercent = 0;
      }
    } else {
      discountPercent = 0;
    }
    if (useData.userType[0] == "Individual" && subsDiscount) {
      discountPercent = (itemsPrice * subsDiscount) / 100;
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

    for (let i = 0; i < lineItems.length; i++) {
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
      commit: true,
      currencyCode: "USD",
    };
    const taxData = await client
      .createTransaction({ model: taxDocument })
      .then((result) => {
        // response tax document

        // console.log("310", result);
        return result.lines;
      })
      .catch(function (err) {
        console.log(err.message);
        return err.message;
      });
    return taxData;
  } catch (err) {
    console.log(err.message);
  }
};

const calTaxforSecondSubs = async ({ order }) => {
  try {
    const useData = order[0];

    const subsDiscount = useData.subsDiscount;

    const lineItems = useData.order.orderItems;
    const shippingAddress = useData.order.shippingAddress;
    const tectonCustomerId = useData.user;
    const shippingPrice = useData.order.shippingPrice;

    let discountPercent = 0;
    let itemsPrice = 0;
    const addPrice = lineItems.map((value) => {
      itemsPrice += value.itemTotalPrice;
    });

    const userMetaData = await UserMetaModel.find({
      userId: tectonCustomerId,
    });

    if (useData.userType[0] == "Ambassador") {
      var ambMeta = await AmbassadorMeta.find({ userId: tectonCustomerId });
    } else {
      ambMeta = [];
    }
    if (userMetaData.length > 0 || ambMeta.length > 0) {
      const userType = useData.userType[0];
      if (
        (userType == "Individual" && userMetaData[0].firstPurchase == true) ||
        userType == [""]
      ) {
        const getPercent = userMetaData[0].ambassador.discountPercent;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Employee") {
        const getPercent = userMetaData[0].employee.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Veteran") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Test") {
        const getPercent = userMetaData[0].veteran.discountPercentOrder;
        discountPercent = itemsPrice * (getPercent / 100);
      } else if (userType == "Ambassador") {
        const findAmbMeta = await AmbassadorMeta.find({
          userId: tectonCustomerId,
        });
        const getPercent = findAmbMeta[0].discountPercent;

        discountPercent = itemsPrice * (getPercent / 100);
      } else {
        discountPercent = 0;
      }
    } else {
      discountPercent = 0;
    }

    if (useData.userType[0] == "Individual" && subsDiscount) {
      discountPercent = (itemsPrice * subsDiscount) / 100;
    } else if (useData.userType[0] == "Guest" && subsDiscount) {
      discountPercent = (itemsPrice * subsDiscount) / 100;
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
        amount: shippingPrice,
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
      commit: true,
      currencyCode: "USD",
    };

    const taxData = await client
      .createTransaction({ model: taxDocument })
      .then((result) => {
        // response tax document

        // console.log("160", result);
        return result.summary;
      })
      .catch(function (err) {
        console.log(err);
        return err.message;
      });
    return taxData;
  } catch (err) {
    console.log(err.message);
  }
};

module.exports = { salesTax, newSubsTax, calTaxforSecondSubs };
