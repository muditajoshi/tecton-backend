const transporter = require("./transporter");
const dotenv = require("dotenv");
dotenv.config();
const ejs = require("ejs");
const path = require("path");

exports.empApplicationReceived = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/employee/employeeSubmited.ejs"
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
exports.empApplicationRejected = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/employee/employeeRejected.ejs"
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
exports.empApplicationAccepted = async ({ email, firstName, lastName }) => {
  try {
    const requiredPath = path.join(
      __dirname,
      "../views/employee/employeeApproved.ejs"
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
