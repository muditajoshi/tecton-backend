const transporter = require("./transporter.js");
const subscriptionController = require("../controllers/subscriptionController.js");
const dotenv = require("dotenv");
const ejs = require("ejs");
const path = require("path");
dotenv.config();

// send email
exports.subscriptionEmailCancel = async ({
  email,
  firstNameShippingAddress,
  lastNameShippingAddress,
  id,
}) => {
  try {
    const requiredPath = path.join(__dirname, "../views/cancel.ejs");
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstNameShippingAddress + " " + lastNameShippingAddress,
      id: id,
    });

    const options = {
      from: process.env.EMAIL, // sender address
      to: email,

      subject: "Subscription Cancelled ", // Subject line
      // template: "cancel",
      // context: {
      //   name: firstNameShippingAddress + " " + lastNameShippingAddress,
      //   id: id,
      // },

      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};

// exports.subscriptionEmailSkip = async ({ email }) => {
//   const options = {
//     from: process.env.EMAIL, // sender address
//     to: email,
//     subject: "Subscription Updated ", // Subject line
//     html: `<div">
//     <div>
//             <h2>Your subscription has been skipped successfully.</h2>

//             <br/>
//             <br>

// </div>
//         `,
//   };
//   const mailSent = await transporter.sendMail(options, (err, info) => {
//     if (err) {
//       console.log(err);
//     } else {
//       console.log(info);
//     }
//   });
//   if (mailSent) return Promise.resolve(1);
//   //   Email(options)
// };

exports.subscriptionEmailUpdated = async ({
  email,
  firstName,
  lastName,
  getId,
  getDate,
  updatedQty,
  orderData,
  updatedFreq,
  totalOrderValue,
  itemTotalPrice,
  productArray,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/updateSubscription.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      name: firstName + " " + lastName,
      id: getId,
      date: getDate,
      orderData: orderData,
      updatedQty,
      updatedFreq,
      totalOrderValue,
      itemTotalPrice,
      productArray,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Subscription Updated ", // Subject line
      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};

exports.subscriptionSkipped = async ({
  email,
  firstName,
  lastName,
  getId,
  pauseDate,
  getDate,
  orderData,
  orderDetails,
  netTotal,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/skippedSubscription.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      name: firstName + " " + lastName,
      id: getId,
      date: getDate,
      orderData: orderData,
      orderDetails,
      pauseDate,
      netTotal,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Subscription Updated ", // Subject line
      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};

exports.shipNowSubscription = async ({
  email,
  firstName,
  lastName,
  getId,
  pauseDate,
  getDate,
  orderData,
  orderDetails,
  netTotal,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/shipNowSubscription.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      name: firstName + " " + lastName,
      id: getId,
      date: getDate,
      orderData: orderData,
      orderDetails,
      pauseDate,
      netTotal,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Subscription Updated ", // Subject line
      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};

exports.subscriptionEmailCreated = async ({
  email,
  firstName,
  lastName,
  getId,
  getDate,
  orderData,
  completeOrder,
  discountPrice,
  netTotal,
  recurringTotal,
  calTax,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/confirmSubscription.ejs"
    );

    const data = await ejs.renderFile(requiredPath, {
      name: firstName + " " + lastName,
      id: getId,
      date: getDate,
      totalPrice: netTotal,
      orderData: orderData,
      orderDetail: completeOrder,
      discountPrice: discountPrice,
      recurringTotal,
      calTax,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Subscription Created Successfully ", // Subject line
      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};

exports.upcomingSubscriptionEmail = async ({
  email,
  orderId,
  orderData,
  discountPrice,
  netPrice,
  getDate,
  subtotal,
  taxPrice,
  shippingPrice,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/upcomingSubscription.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      orderId: orderId,
      orderData: orderData,
      discountPrice: discountPrice,
      netPrice: netPrice,
      getDate: getDate,
      subtotal: subtotal,
      taxPrice: taxPrice,
      shippingPrice: shippingPrice,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Upcoming Subscription", // Subject line
      html: data,
    };
    const mailSent = await transporter.sendMail(options, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });
    if (mailSent) return Promise.resolve(1);
    //   Email(options)
  } catch (err) {
    console.log(err.message);
  }
};
