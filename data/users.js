const bcrypt = require("bcryptjs");

const users = [
  {
    firstName: "Admin",
    email: "rajat.sharma@s3bglobal.com",
    password: bcrypt.hashSync("pass123", 12),
    isAdmin: true,
    isConfirmed: true,
    avatar: "/images/icon_user.png",
  },
  {
    name: "Rajat",
    email: "rajat.sharma@s3bglobal.com",
    password: bcrypt.hashSync("pass123", 12),
    isConfirmed: true,
    avatar: "/images/icon_user.png",
  },
  {
    name: "rajati",
    email: "rajat.sharma@s3bglobal.com",
    password: bcrypt.hashSync("pass123", 12),
    isConfirmed: true,
    avatar: "/images/icon_user.png",
  },
  {
    name: "rajat",
    email: "rajat.sharma@s3bglobal.com",
    password: bcrypt.hashSync("pass123", 12),
    isConfirmed: true,
    avatar: "/images/icon_user.png",
  },
];

module.exports = users;
