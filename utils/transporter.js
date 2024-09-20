const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const path = require("path");
const hbs = require("nodemailer-express-handlebars");
dotenv.config();

// configure the transporter for nodemailer to use gmail account to send mails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD,
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
  },
});

// const handlebarOptions = {
//   viewEngine: {
//     extName: ".hbs",
//     partialsDir: path.resolve("./views"),
//     defaultLayout: false,
//   },
//   viewPath: path.resolve("./views"),
//   extName: ".hbs",
// };
// transporter.use("compile", hbs(handlebarOptions));
module.exports = transporter;
