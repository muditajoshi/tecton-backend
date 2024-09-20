const transporter = require("./transporter.js");
const dotenv = require("dotenv");
const ejs = require("ejs");
const path = require("path");

dotenv.config();

// send email
const orderConfirmedEmail = async ({
  email,
  orderId,
  orderData,
  discountPrice,
}) => {
  try {
    const requiredPath = path.join(__dirname, "../views/orderConfirm.ejs");
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      orderId: orderId,
      orderData: orderData,
      discountPrice: discountPrice,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Order Created Successfully", // Subject line
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

const orderConfirmedEmailNormalUser = async ({ email, orderId, orderData }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/orderConfirmNormalUser.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      orderId: orderId,
      orderData: orderData,
    });
    const options = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Order Created Successfully", // Subject line
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

module.exports = {
  orderConfirmedEmailNormalUser,
  orderConfirmedEmail,
};
