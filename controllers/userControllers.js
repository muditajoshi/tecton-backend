//  Tectonlife.com Developed by: S3B Global

// `Email: info@s3bglobal.com, sunil@s3bglobal.com`

// Development Team: Rajat Sharma, Mudita Joshi

// updated at Date time : 17 may 2023, 04:47 PM IST

const asyncHandler = require("express-async-handler");
const User = require("../models/userModel.js");
const Token = require("../models/tokenModel.js");
const generateToken = require("../utils/generateToken.js");
const sendMail = require("../utils/sendMail.js");
const generateGravatar = require("../utils/generateGravatar.js");
const jwt = require("jsonwebtoken");
const externalIdModel = require("../models/externalId");
const bcrypt = require("bcryptjs");
const externalId = require("../models/externalId");
const { collection } = require("../models/userModel.js");
const { v4: uuidv4 } = require("uuid");
const Stripe = require("stripe");
const dotenv = require("dotenv");
const Ambassador = require("../models/ambassador.js");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const UserMetaData = require("../models/userMetaModel");
const UserTypeDiscountModel = require("../models/userTypeDiscountModel");
const { error } = require("winston");
const limiter = require("../middleware/loginLimiter");
const axios = require("axios");
const {
  vetApplicationReceived,
  vetApplicationAccepted,
  vetApplicationRejected,
} = require("../utils/veteranEmail");
const {
  empApplicationReceived,
  empApplicationAccepted,
  empApplicationRejected,
} = require("../utils/employeeEmail");
const GlobalValuesModel = require("../models/globalValuesModel.js");

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// @desc Get all the users info
// @route GET /api/users
// @access PRIVATE/ADMIN
const getAllUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.pageNumber) || 1; // the current page number in the pagination
  const pageSize = 20; // total number of entries on a single page
  const count = await User.countDocuments({}); // total number of documents available
  // const count = await Order.countDocuments({}); // total number of documents available

  // find all orders that need to be sent for the current page, by skipping the documents included in the previous pages
  // and limiting the number of documents included in this request
  // sort this in desc order that the document was created at
  const allUsers = await User.find({})
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort("-createdAt");

  // send the list of orders, current page number, total number of pages available
  res.json({
    users: allUsers,
    page,
    pages: Math.ceil(count / pageSize),
    total: count,
  });
});

// @desc Delete a user
// @route DELETE /api/users/:id
// @access PRIVATE/ADMIN
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user) {
    await user.remove();
    res.json({
      message: "User removed from DB",
    });
  } else {
    res.status(404);
    throw new Error("User not found");
  }
});

// @desc get user by ID
// @route GET /api/users/:id
// @access PRIVATE/ADMIN
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (user) res.json(user);
  else {
    res.status(404);
    throw new Error("User does not exist");
  }
  //   console.log(res);
});

// @desc update user from the admin panel
// @route PUT /api/users/:id
// @access PRIVATE/ADMIN
const updateUser = asyncHandler(async (req, res) => {
  // do not include the hashed password when fetching this user
  const user = await User.findById(req.params.id).select("-password");
  if (user) {
    // update whicever field was sent in the rquest body
    user.name = req.body.name || user.name;
    user.isConfirmed = req.body.email === user.email;
    user.email = req.body.email || user.email;
    user.isAdmin = req.body.isAdmin;
    const updatedUser = await user.save();
    if (updatedUser) {
      res.json({
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        isAdmin: updatedUser.isAdmin,
        isConfirmed: updatedUser.isConfirmed,
      });
    }
  } else {
    res.status(400);
    throw new Error("User not found.");
  }
});

// @desc authenticate user and get token
// @route POST /api/users/login
// @access PUBLIC
const authUser = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  //   console.log(email);

  const { password } = req.body;

  // for guest user conversion start
  let userCheckForGuest = await User.findOne({ email });
  if (userCheckForGuest == null) {
    res.status(401);
    throw new Error("user not found");
  } else if (
    userCheckForGuest.userType[0] == "Guest" &&
    (await userCheckForGuest.matchPassword(password))
  ) {
    const updateGuestUser = await User.updateOne(
      { _id: userCheckForGuest._id },
      { $set: { userType: ["Individual"], isConfirmed: true } }
    );
  }
  // for guest user conversion end

  let user = await User.findOne({ email });
  if (user == null) {
    res.status(401).json({ message: "user not found" });
  } else {
    // generate both the access and the refresh tokens
    const accessToken = generateToken(user._id, "access");
    const refreshToken = generateToken(user._id, "refresh");

    // if the passwords are matching, then check if a refresh token exists for this user
    if (user && (await user.matchPassword(password))) {
      const userMeta = await UserMetaData.findOne({ userId: user._id });
      const ambassadorMeta = await AmbassadorMetaData.findOne({
        userId: user._id,
      });
      const existingToken = await Token.findOne({ email });
      // if no refresh token available, create one and store it in the db
      if (!existingToken) {
        const newToken = await Token.create({
          email,
          token: refreshToken,
        });
      } else {
        existingToken.token = refreshToken;
        existingToken.save();
      }

      if (userMeta) {
        res.json({
          id: user._id,
          userType: user.userType,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phoneNo,
          shippingAddress: user.shippingAddress,
          billingAddress: user.billingAddress,
          stripeCustomerId: user.stripeCustomerId,
          isAdmin: user.isAdmin,
          isConfirmed: user.isConfirmed,
          avatar: user.avatar,
          accessToken,
          refreshToken,
          userMetaData: {
            firstPurchase: userMeta.firstPurchase,
            discountPercent: userMeta.ambassador.discountPercent,
            refCode: userMeta.ambassador.refCode,
            employee: userMeta.employee,
            veteran: userMeta.veteran,
            test: userMeta.test,
          },
        });
      } else if (ambassadorMeta) {
        res.json({
          id: user._id,
          userType: user.userType,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          socialMedia: user.socialMedia,
          phone: user.phoneNo,
          shippingAddress: user.shippingAddress,
          billingAddress: user.billingAddress,
          stripeCustomerId: user.stripeCustomerId,
          isAdmin: user.isAdmin,
          isConfirmed: user.isConfirmed,
          avatar: user.avatar,
          accessToken,
          refreshToken,
          ambassadorMetaData: {
            ambassadorNo: ambassadorMeta.ambassadorNo,
            userId: ambassadorMeta.userId,
            refCode: ambassadorMeta.refCode,
            discountPercent: ambassadorMeta.discountPercent,
          },
        });
      } else {
        res.json({
          id: user._id,
          userType: user.userType,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phoneNo,
          shippingAddress: user.shippingAddress,
          billingAddress: user.billingAddress,
          stripeCustomerId: user.stripeCustomerId,
          isAdmin: user.isAdmin,
          isConfirmed: user.isConfirmed,
          avatar: user.avatar,
          accessToken,
          refreshToken,
        });
      }
    } else {
      limiter(req, res, () => {});
      res.status(401);
      throw new Error(user ? "Invalid Password" : "Invalid email");
    }
  }
});

// @desc register a new user
// @route POST /api/users/
// @access PUBLIC
const registerUser = asyncHandler(async (req, res) => {
  //   console.log(req.body);

  const email = req.body.email.toLowerCase();
  const firstNameCamelCase = req.body.firstName;
  const lastNameCamelCase = req.body.lastName;
  const firstName =
    firstNameCamelCase.charAt(0).toUpperCase() +
    firstNameCamelCase.slice(1).toLowerCase();
  const lastName =
    lastNameCamelCase.charAt(0).toUpperCase() +
    lastNameCamelCase.slice(1).toLowerCase();

  let {
    gender,
    password,
    userType,
    termsAndConditions,
    einNumber,
    businessName,
    accountOwner,
    refCode,
    id,
  } = req.body;

  //ambassador ref code start
  let checkRefCode;
  if (refCode) {
    checkRefCode = await AmbassadorMetaData.findOne({ refCode: refCode });
    if (!checkRefCode) {
      // res.status(400);
      // throw new Error("invalid referal code");
    }
  }
  // ambassador ref code end

  const userExists = await User.findOne({ email });

  if (userExists && userExists.userType[0] == "Guest") {
    // if guest user exist then converting it to the individual user

    const getGovxCode = await GlobalValuesModel.findOne({
      "utility.utilityType": "GovxCode",
    });
    if (userType == "Veteran" && getGovxCode.utility.govxCode !== req.body.id) {
      return res.status(400).json({
        error: "Invalid Govx Code",
      });
    }

    console.log(req.body);
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const updateGuest = await User.updateOne(
      { email: userExists.email },
      { $set: { password: hash, userType: userType } }
    );

    // update user meta table start

    let updateMeta;
    const getDiscount = await UserTypeDiscountModel.find({});

    if (userType == "Veteran") {
      updateMeta = await UserMetaData.create({
        userId: userExists._id,
        firstPurchase: false,
        "veteran.id": req.body.id,
        "veteran.isApproved": true,
        "veteran.discountPercentOrder": getDiscount[0].veteran.discountPercent,
        "veteran.discountPercentSubscription":
          getDiscount[0].veteran.discountPercent,
      });
    } else if (userType == "Employee") {
      updateMeta = await UserMetaData.create({
        userId: userExists._id,
        firstPurchase: false,
        "employee.id": req.body.id,
      });
    }

    // send a mail for email verification of the newly registred email id
    await sendMail(userExists._id, userExists.email, "email verification");

    const refreshToken = generateToken(userExists._id, "refresh");

    //send vet application received email
    const email = userExists.email;
    const firstName = userExists.firstName;
    const lastName = userExists.lastName;
    const id = userExists._id;

    const discountPercent = getDiscount[0].veteran.discountPercent;

    if (userType == "Veteran") {
      // await vetApplicationReceived({
      //   email,
      //   firstName,
      //   lastName,
      //   id,
      //   discountPercent,
      // });

      await vetApplicationAccepted({ firstName, lastName, email });
    } else if (userType == "Employee") {
      await empApplicationReceived({ email, firstName, lastName, id });
    }
    return res.status(201).json({
      email: userExists.email,
      message: "User created successfully",
    });
  } else if (userExists) {
    res.status(400);
    throw new Error("Email already registered");
  } else if (userType == "Veteran") {
    const getGovxCode = await GlobalValuesModel.findOne({
      "utility.utilityType": "GovxCode",
    });
    if (getGovxCode.utility.govxCode !== id) {
      return res.status(400).json({
        error: "Invalid Govx Code",
      });
    }
  }

  // the gravatar will be unique for each registered email
  const avatar = generateGravatar(email);
  const customer = await stripe.customers.create({
    email: email,
    name: firstName + " " + lastName,
    description: "customer created",
  });
  console.log(customer);

  // test user creation
  if (email == "tectonuser@gmail.com") {
    userType = "Test";
  }

  const user = await User.create({
    firstName,
    lastName,
    gender,
    email,
    password,
    avatar,
    userType,
    termsAndConditions,
    einNumber,
    accountOwner,
    businessName,
    stripeCustomerId: customer.id,
  });

  // update user meta table start

  let updateMeta;
  const getDiscount = await UserTypeDiscountModel.find({});
  const ambRefDiscount = getDiscount[0].ambassadorReferral.discountPercent;
  if (checkRefCode) {
    updateMeta = await UserMetaData.create({
      userId: user._id,
      firstPurchase: true,
      "ambassador.discountPercent": ambRefDiscount,
      "ambassador.refCode": refCode,
    });
  } // if userType veteran || employee
  else if (userType == "Veteran") {
    updateMeta = await UserMetaData.create({
      userId: user._id,
      firstPurchase: true,
      "veteran.id": id,
      "veteran.isApproved": true,
      "veteran.discountPercentOrder": getDiscount[0].veteran.discountPercent,
      "veteran.discountPercentSubscription":
        getDiscount[0].veteran.discountPercent,
    });
  } else if (userType == "Employee") {
    updateMeta = await UserMetaData.create({
      userId: user._id,
      firstPurchase: true,
      "employee.id": id,
    });
  } else if (userType == "Test") {
    updateMeta = await UserMetaData.create({
      userId: user._id,
      firstPurchase: true,
      "test.id": "testing",
      "test.isApproved": true,
      "test.discountPercentOrder": getDiscount[0].test.discountPercent,
      "test.discountPercentSubscription": getDiscount[0].test.discountPercent,
    });
  }
  // update user meta table end

  // if user was created successfully
  if (user) {
    // send a mail for email verification of the newly registred email id
    await sendMail(user._id, email, "email verification");

    const refreshToken = generateToken(user._id, "refresh");

    // External ID code start
    const collectionID = uuidv4();
    const getdata = [
      { id: user._id, name: "TECTON" },
      { id: customer.id, name: "STRIPE" },
    ];
    const saveId = new externalIdModel({
      externalId: getdata,
      id: collectionID,
      idType: "CUSTOMER",
    });
    const dbID = await saveId.save();

    var config = {
      method: "post",

      url: process.env.WORKATO_WEBHOOK_ACCOUNTCREATION,

      headers: {
        "Content-Type": "application/json",
      },

      data: user,
    };

    axios(config)
      .then(function (response) {
        console.log(response.data);
      })

      .catch(function (error) {
        console.log(error.message);
      });

    // External ID code end
    res.status(201).json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      stripeCustomerId: user.stripeCustomerId,
      gender: user.gender,
      accountOwner: user.accountOwner,
      businessName: user.businessName,
      einNumber: user.einNumber,
      avatar,
      isAdmin: user.isAdmin,
      isConfirmed: user.isConfirmed,
      userType: user.userType,
      userMetaData: updateMeta,
      accessToken: generateToken(user._id, "access"),
      refreshToken,
    });

    //send vet application received email
    if (userType == "Veteran") {
      const email = user.email;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const id = user._id;
      const discountPercent = getDiscount[0].veteran.discountPercent;
      await vetApplicationReceived({
        email,
        firstName,
        lastName,
        id,
        discountPercent,
      });
    } else if (userType == "Employee") {
      const email = user.email;
      const firstName = user.firstName;
      const lastName = user.lastName;
      const id = user._id;
      await empApplicationReceived({ email, firstName, lastName, id });
    }
  } else {
    res.status(400);
    throw new Error("User not created");
  }
});

// @desc send a mail with the link to verify mail
// @route POST /api/users/confirm
// @access PUBLIC
const mailForEmailVerification = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    // console.log(user);
    if (user) {
      // send a verification email, if this user is not a confirmed email
      if (!user.isConfirmed) {
        // send the mail
        await sendMail(user._id, email, "email verification");
        res.status(201).json({
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          avatar: user.avatar,
          accountOwner: user.accountOwner,
          businessName: user.businessName,
          einNumber: user.einNumber,
          userType: user.userType,
          isConfirmed: user.isConfirmed,
        });
      } else {
        res.status(400);
        throw new Error("User already confirmed");
      }
    }
  } catch (error) {
    //     console.log(error);
    res.status(401);
    throw new Error("Could not send the mail. Please retry.");
  }
});

// @desc send a mail with the link to reset password
// @route POST /api/users/reset
// @access PUBLIC
const mailForPasswordReset = asyncHandler(async (req, res) => {
  //   console.log(req.body);
  try {
    const { email } = req.body;
    console.log(email);
    const user = await User.findOne({ email });

    // send a link to reset password only if it's a confirmed account
    if (user) {
      // send the mail and return the user details

      // the sendMail util function takes a 3rd argument to indicate what type of mail to send
      console.log("working");
      const sendemail = await sendMail(user._id, email, "forgot password");

      res.status(201).json({
        message: "success",
        id: user._id,
        email: user.email,
      });
    } else {
      res.status(404);
      throw new Error("user not found");
    }
  } catch (error) {
    res.status(401);
    throw new Error("user not found.");
  }
});

// @desc reset password of any verified user
// @route PUT /api/users/reset
// @access PUBLIC
const resetUserPassword = asyncHandler(async (req, res) => {
  try {
    // update the user password if the jwt is verified successfully
    const { passwordToken, password } = req.body;
    const decodedToken = jwt.verify(
      passwordToken,
      process.env.JWT_FORGOT_PASSWORD_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken.id);

    if (user && password) {
      user.password = password;
      const updatedUser = await user.save();

      if (updatedUser) {
        res.status(200).json({
          id: updatedUser._id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatar: updatedUser.avatar,
          accountOwner: updatedUser.accountOwner,
          businessName: updatedUser.businessName,
          einNumber: updatedUser.einNumber,
          isAdmin: updatedUser.isAdmin,
          userType: updatedUser.userType,
        });
      } else {
        res.status(401);
        throw new Error("Unable to update password");
      }
    }
  } catch (error) {
    res.status(400);
    throw new Error("User not found.");
  }
});

// @desc confirm the email address of the registered user
// @route GET /api/users/confirm
// @access PUBLIC
const confirmUser = asyncHandler(async (req, res) => {
  try {
    // set the user to a confirmed status, once the corresponding JWT is verified correctly
    const emailToken = req.params.token;
    const decodedToken = jwt.verify(
      emailToken,
      process.env.JWT_EMAIL_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken.id).select("-password");
    user.isConfirmed = true;
    const updatedUser = await user.save();
    const foundToken = await Token.findOne({ email: updatedUser.email }); // send the refresh token that was stored
    res.json({
      id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      isAdmin: updatedUser.isAdmin,
      accountOwner: updatedUser.accountOwner,
      businessName: updatedUser.businessName,
      einNumber: updatedUser.einNumber,
      avatar: updatedUser.avatar,
      isConfirmed: updatedUser.isConfirmed,
      userType: updatedUser.userType,
      accessToken: generateToken(user._id, "access"),
      refreshToken: foundToken,
    });
  } catch (error) {
    //     console.log(error);
    res.status(401);
    throw new Error("Not authorised. Token failed");
  }
});

// @desc obtain new access tokens using the refresh tokens
// @route GET /api/users/refresh
// @access PUBLIC
const getAccessToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.body.token;

    const email = req.body.email;

    // search if currently loggedin user has the refreshToken sent

    const currentAccessToken = await Token.findOne({ email });

    if (!refreshToken || refreshToken !== currentAccessToken.token) {
      res.status(400);
      throw new Error("Refresh token not found, login again");
    }

    // If the refresh token is valid, create a new accessToken and return it.
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_TOKEN_SECRET,
      (err, user) => {
        if (!err) {
          const accessToken = generateToken(user.id, "access");
          return res.json({ success: true, accessToken });
        } else {
          return res.json({
            success: false,
            message: "Invalid refresh token",
          });
        }
      }
    );
  } catch (err) {
    console.log(err.message);
  }
});

// @desc get user data for google login in the frontend
// @route POST /api/users/passport/data
// @access PUBLIC
const getUserData = asyncHandler(async (req, res) => {
  const { id } = req.body;
  const user = await User.findById(id);
  if (user) {
    res.json({
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountOwner: user.accountOwner,
      businessName: user.businessName,
      einNumber: user.einNumber,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      phoneNo: user.phoneNo,
      avatar: user.avatar,
      isAdmin: user.isAdmin,
      isConfirmed: user.isConfirmed,
      userType: user.userType,
    });
  } else {
    res.status(400);
    throw new Error("User not authorised to view this page");
  }
});

// @desc get data for an authenticated user
// @route GET /api/users/profile
// @access PRIVATE
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const userMeta = await UserMetaData.findOne({ userId: user._id });
  const ambassadorMeta = await AmbassadorMetaData.findOne({
    userId: user._id,
  });

  if (userMeta) {
    res.json({
      id: user._id,
      userType: user.userType,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phoneNo,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      stripeCustomerId: user.stripeCustomerId,
      isAdmin: user.isAdmin,
      isConfirmed: user.isConfirmed,
      avatar: user.avatar,
      userMetaData: {
        firstPurchase: userMeta.firstPurchase,
        discountPercent: userMeta.ambassador.discountPercent,
        refCode: userMeta.ambassador.refCode,
        employee: userMeta.employee,
        veteran: userMeta.veteran,
        test: userMeta.test,
      },
    });
  } else if (ambassadorMeta) {
    res.json({
      id: user._id,
      userType: user.userType,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      socialMedia: user.socialMedia,
      phone: user.phoneNo,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      stripeCustomerId: user.stripeCustomerId,
      isAdmin: user.isAdmin,
      isConfirmed: user.isConfirmed,
      avatar: user.avatar,
      ambassadorMetaData: {
        ambassadorNo: ambassadorMeta.ambassadorNo,
        userId: ambassadorMeta.userId,
        refCode: ambassadorMeta.refCode,
        discountPercent: ambassadorMeta.discountPercent,
      },
    });
  } else if (user) {
    res.status(200).json({
      id: user._id,
      email: user.email,
      avatar: user.avatar,
      accountOwner: user.accountOwner,
      businessName: user.businessName,
      einNumber: user.einNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      userType: user.userType,
      stripeCustomerId: user.stripeCustomerId,
      shippingAddress: user.shippingAddress,
      billingAddress: user.billingAddress,
      phoneNo: user.phoneNo,
      joinTheExtClub: user.joinTheExtClub,
    });
  } else {
    res.status(400);
    throw new Error("User not authorised to view this page");
  }
});

// @desc update data for an authenticated user
// @route PUT /api/users/profile
// @access PRIVATE
const updateUserProfile = asyncHandler(async (req, res) => {
  // console.log(req.body);
  // console.log(req.user.id);
  const { address1 } = req.body;
  const user = await User.findById(req.user.id);
  const billingAddressOld = user.billingAddress;
  // console.log(billingAddressOld);

  if (user) {
    if (!req.body.billingAddress) {
      // update whichever field is sent in the req body
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.avatar = req.body.avatar || user.avatar;
      user.phoneNo = req.body.phoneNo || user.phoneNo;
      user.joinTheExtClub = req.body.joinTheExtClub || user.joinTheExtClub;
      user.accountOwner = req.body.accountOwner || user.accountOwner;
      user.businessName = req.body.businessName || user.businessName;
      user.einNumber = req.body.einNumber || user.einNumber;
      user.shippingAddress.address1 = address1 || user.address1;

      user.shippingAddress.address2 = req.body.address2 || user.address2;

      user.shippingAddress.city = req.body.city || user.city;

      user.shippingAddress.state = req.body.state || user.state;

      user.shippingAddress.zip = req.body.zip || user.zip;

      user.shippingAddress.country = req.body.country || user.country;
      user.billingAddress = billingAddressOld;
    } else {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.avatar = req.body.avatar || user.avatar;
      user.phoneNo = req.body.phoneNo || user.phoneNo;
      user.joinTheExtClub = req.body.joinTheExtClub || user.joinTheExtClub;
      user.accountOwner = req.body.accountOwner || user.accountOwner;
      user.businessName = req.body.businessName || user.businessName;
      user.einNumber = req.body.einNumber || user.einNumber;
      user.shippingAddress.address1 = address1 || user.address1;

      user.shippingAddress.address2 = req.body.address2 || user.address2;

      user.shippingAddress.city = req.body.city || user.city;

      user.shippingAddress.state = req.body.state || user.state;

      user.shippingAddress.zip = req.body.zip || user.zip;

      user.shippingAddress.country = req.body.country || user.country;
      user.billingAddress.firstName = req.body.billingAddress.firstName;

      user.billingAddress.lastName = req.body.billingAddress.lastName;

      user.billingAddress.email = req.body.billingAddress.email;

      user.billingAddress.phoneNo = req.body.billingAddress.phoneNo;

      user.billingAddress.address1 = req.body.billingAddress.address1;

      user.billingAddress.address2 = req.body.billingAddress.address2;

      user.billingAddress.city = req.body.billingAddress.city;

      user.billingAddress.state = req.body.billingAddress.state;

      user.billingAddress.country = req.body.billingAddress.country;

      user.billingAddress.zip = req.body.billingAddress.zip;
    }

    if (req.body.email) user.isConfirmed = req.body.email === user.email;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    const userMeta = await UserMetaData.findOne({ userId: user._id });
    const ambassadorMeta = await AmbassadorMetaData.findOne({
      userId: user._id,
    });
    // check if the current user logged in is with a social account, in which case do not create/find any access or refresh tokens
    const isSocialLogin =
      updatedUser.googleID ||
      updatedUser.linkedinID ||
      updateUser.githubID ||
      updatedUser.twitterID;

    // setting data according to meta start

    let updatedUserObj;

    if (userMeta) {
      updatedUserObj = {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        accountOwner: updatedUser.accountOwner,
        businessName: updatedUser.businessName,
        einNumber: updatedUser.einNumber,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin,
        isConfirmed: updatedUser.isConfirmed,
        userType: updatedUser.userType,
        phoneNo: updatedUser.phoneNo,
        joinTheExtClub: updatedUser.joinTheExtClub,
        shippingAddress: updatedUser.shippingAddress,
        billingAddress: updatedUser.billingAddress,
        userMetaData: {
          firstPurchase: userMeta.firstPurchase,
          discountPercent: userMeta.ambassador.discountPercent,
          refCode: userMeta.ambassador.refCode,
          employee: userMeta.employee,
          veteran: userMeta.veteran,
          test: userMeta.test,
        },
      };
    } else if (ambassadorMeta) {
      updatedUserObj = {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        accountOwner: updatedUser.accountOwner,
        businessName: updatedUser.businessName,
        einNumber: updatedUser.einNumber,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin,
        isConfirmed: updatedUser.isConfirmed,
        userType: updatedUser.userType,
        phoneNo: updatedUser.phoneNo,
        joinTheExtClub: updatedUser.joinTheExtClub,
        shippingAddress: updatedUser.shippingAddress,
        billingAddress: updatedUser.billingAddress,
        ambassadorMetaData: {
          ambassadorNo: ambassadorMeta.ambassadorNo,
          userId: ambassadorMeta.userId,
          refCode: ambassadorMeta.refCode,
          discountPercent: ambassadorMeta.discountPercent,
        },
      };
    } else {
      updatedUserObj = {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        accountOwner: updatedUser.accountOwner,
        businessName: updatedUser.businessName,
        einNumber: updatedUser.einNumber,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin,
        isConfirmed: updatedUser.isConfirmed,
        userType: updatedUser.userType,
        phoneNo: updatedUser.phoneNo,
        joinTheExtClub: updatedUser.joinTheExtClub,
        shippingAddress: updatedUser.shippingAddress,
        billingAddress: updatedUser.billingAddress,
      };
    }
    // setting data according to meta end

    if (updatedUser) {
      if (!isSocialLogin) {
        const refreshToken = generateToken(updatedUser._id, "refresh");
        const existingToken = await Token.findOne({
          email: updatedUser.email,
        });
        // store a new refresh token for this email
        if (existingToken) {
          existingToken.token = refreshToken;
          existingToken.save();
        } else {
          Token.create({
            user: updatedUser._id,
            token: refreshToken,
          });
        }
        // add these two token to the response
        updatedUserObj = {
          ...updatedUserObj,
          accessToken: generateToken(updatedUser._id, "access"),
          refreshToken,
        };
      }
      res.json(updatedUserObj);
    }
  } else {
    res.status(400);
    throw new Error("User not found.");
  }
});

const getAllVeterans = async (req, res) => {
  try {
    const mergedata = await User.aggregate([
      {
        $lookup: {
          from: "usermetadatas",
          localField: "_id",
          foreignField: "userId",
          as: "userMetaData",
        },
      },
      {
        $match: {
          userType: ["Veteran"],
        },
      },
      {
        $project: {
          "userMetaData.ambassador": 0,
          "userMetaData.employee": 0,
        },
      },
    ]).sort("-createdAt");

    res.status(200).json({ veterans: mergedata });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

const getAllEmployees = async (req, res) => {
  try {
    const mergedata = await User.aggregate([
      {
        $lookup: {
          from: "usermetadatas",
          localField: "_id",
          foreignField: "userId",
          as: "userMetaData",
        },
      },
      {
        $match: {
          userType: ["Employee"],
        },
      },
      {
        $project: {
          "userMetaData.ambassador": 0,
          "userMetaData.veteran": 0,
        },
      },
    ]).sort("-createdAt");

    res.status(200).json({ employees: mergedata });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

const approvalEmpVet = async (req, res) => {
  try {
    const id = req.body.id;
    const isApproved = req.body.isApproved;
    const getData = await User.findOne({ _id: id });
    const getDiscount = await UserTypeDiscountModel.find({});
    const firstName = getData.firstName;
    const lastName = getData.lastName;
    const email = getData.email;

    if (getData.userType[0] === "Veteran") {
      if (isApproved == true) {
        const veteranDiscount = getDiscount[0].veteran.discountPercent;
        const createMeta = await UserMetaData.updateOne(
          { userId: id },
          {
            $set: {
              "veteran.isApproved": true,
              "veteran.discountPercentOrder": veteranDiscount,
              "veteran.discountPercentSubscription": veteranDiscount,
            },
          }
        );
        vetApplicationAccepted({ firstName, lastName, email });
      } else {
        getData.userType = ["Individual"];
        await getData.save();
        vetApplicationRejected({ firstName, lastName, email });
      }
    } else if (getData.userType[0] === "Employee") {
      if (isApproved == true) {
        const employeeDiscount = getDiscount[0].employee.discountPercent;
        const createMeta = await UserMetaData.updateOne(
          { userId: id },
          {
            $set: {
              "employee.isApproved": true,
              "employee.discountPercentOrder": employeeDiscount,
              "employee.discountPercentSubscription": employeeDiscount,
            },
          }
        );
        empApplicationAccepted({ firstName, lastName, email });
      } else {
        getData.userType = ["Individual"];
        await getData.save();
        empApplicationRejected({ firstName, lastName, email });
      }
    }

    res.status(200).json({ message: "success" });
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

module.exports = {
  approvalEmpVet,
  getAllEmployees,
  getAllVeterans,
  authUser,
  getUserProfile,
  getUserData,
  getAccessToken,
  registerUser,
  confirmUser,
  mailForEmailVerification,
  mailForPasswordReset,
  resetUserPassword,
  updateUserProfile,
  getAllUsers,
  deleteUser,
  getUserById,
  updateUser,
};
