const dotenv = require("dotenv");
const transporter = require("../utils/transporter.js");
const generateToken = require("../utils/generateToken.js");
const ejs = require("ejs");
const path = require("path");

dotenv.config();

const sendMail = async (id, email, option) => {
  const frontendURL = process.env.FRONTEND_BASE_URL;

  // send email for the email verification option
  if (option === "email verification") {
    // create a new JWT to verify user via email
    const emailToken = generateToken(id, "email");
    const url = `${frontendURL}/user/confirm/${emailToken}`;
    const requiredPath = path.join(
      __dirname,
      "../views/accountVerification.ejs"
    );
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      emailToken,
      url,
      frontendURL,
    });
    // set the correct mail option
    const mailOptions = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Confirm your email for Tecton", // Subject line
      html: data,
    };

    const mailSent = await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });

    // send a promise since nodemailer is async
    if (mailSent) return Promise.resolve(1);
  }
  // send a mail for resetting password if forgot password
  else if (option === "forgot password") {
    // create a new JWT to verify user via email
    const forgetPasswordToken = generateToken(id, "forgot password");
    const url = `${frontendURL}/user/password/reset/${forgetPasswordToken}`;

    const requiredPath = path.join(__dirname, "../views/forgotPassword.ejs");
    const data = await ejs.renderFile(requiredPath, {
      email: email,
      url: url,
    });
    const mailOptions = {
      from: process.env.EMAIL, // sender address
      to: email,
      subject: "Reset Password for Tecton", // Subject line
      html: data,
    };

    const mailSent = await transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });

    if (mailSent) return Promise.resolve(1);
  }
};

module.exports = sendMail;
