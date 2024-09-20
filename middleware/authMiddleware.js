const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const express = require("express");
const expressAsyncHandler = require("express-async-handler");

const protectRoute = asyncHandler(async (req, res, next) => {
  let token;

  // if the header includes a Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // get only the token string
      token = req.headers.authorization.split(" ")[1];
      // decode the token to get the corresponding user's id
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_ACCESS_TOKEN_SECRET
      );
      // fetch that user =require() db, but not get the user's password and set this fetched user to the req.user
      req.user = await User.findById(decodedToken.id).select("-password");
      next();
    } catch (error) {
      console.log(error);
      res.status(401);
      throw new Error("Not authorised. Token failed");
    }
  }
  // if the header includes a token for social login case
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("SocialLogin")
  ) {
    const id = req.headers.authorization.split(" ")[1];
    req.user = await User.findById(id);
    token = id;
    next();
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token available");
  }
});

const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) next();
  else {
    res.status(401);
    throw new Error("Not authorised admin");
  }
};

const rawExpress = (req, res, next) => {
  express.raw({ type: "applications/json" });
  next();
};

module.exports = { protectRoute, isAdmin, rawExpress };
