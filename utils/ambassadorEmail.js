const transporter = require("./transporter.js");
const ambassadorController = require("../controllers/ambassadorController.js");
const dotenv = require("dotenv");
dotenv.config();
const ejs = require("ejs");
const path = require("path");

exports.applicationReceived = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/ambassador/applicationReceived.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstName + " " + lastName,
    });

    const options = {
      from: process.env.EMAIL, // sender address
      to: email,

      subject: "Application Received ", // Subject line
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
exports.applicationRejected = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/ambassador/applicationRejected.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstName + " " + lastName,
    });

    const options = {
      from: process.env.EMAIL, // sender address
      to: email,

      subject: "Application Rejected ", // Subject line
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
exports.applicationAccepted = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/ambassador/applicationAccepted.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstName + " " + lastName,
    });

    const options = {
      from: process.env.EMAIL, // sender address
      to: email,

      subject: "Application Accepted ", // Subject line
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
