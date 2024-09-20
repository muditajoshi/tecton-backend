const transporter = require("./transporter");
const dotenv = require("dotenv");
dotenv.config();
const ejs = require("ejs");
const path = require("path");

exports.vetApplicationReceived = async ({
  email,
  firstName,
  lastName,
  discountPercent,
}) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/veteran/veteranSubmitted.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstName + " " + lastName,
      discountPercent: discountPercent,
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
exports.vetApplicationRejected = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/veteran/veteranRejected.ejs"
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
exports.vetApplicationAccepted = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/veteran/veteranApproved.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      name: firstName + " " + lastName,
    });

    const options = {
      from: process.env.EMAIL, // sender address
      to: email,

      subject: "Status approved - Military/First Responder", // Subject line
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
