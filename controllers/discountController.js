const Discount = require("../models/discountModel");
const UserTypeDiscount = require("../models/userTypeDiscountModel");
const UserMetaModel = require("../models/userMetaModel");
const AmbassadorMetaModel = require("../models/ambassadorMetaModel");
const DiscountModel = require("../models/discountModel");
const Order = require("../models/orderModel.js");
const User = require("../models/userModel");
const Stripe = require("stripe");
const dotenv = require("dotenv");
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// this function creates a discount coupon object
exports.createDiscount = async (req, res) => {
  const {
    description,
    validforAll,
    expiryDate,
    effectiveDate,
    minimumOrderValue,
    usageLimit,
    firstTimeUser,
    discountPercentage,
    excludedProducts,
  } = req.body;
  try {
    const couponCode = req.body.couponCode;
    const getDate = expiryDate; // date format MM-DD-YYYY
    const convertDate = new Date(getDate);

    const timeStampExpiry =
      Number(convertDate.getTime()) + Number(process.env.TIME_ZONE);

    const getDate1 = effectiveDate; // date format MM-DD-YYYY
    const convertDate1 = new Date(getDate1);
    const timeStampEffective = convertDate1.getTime();

    if (timeStampExpiry < timeStampEffective) {
      return res.status(404).json({
        message: "Expiry date should be greater than effective date.",
      });
    }

    let data = await DiscountModel.find({ couponCode });
    if (data.length !== 0) {
      return res
        .status(404)
        .json({ message: "Discount coupon already exists." });
    }
    const newCouponCode = new DiscountModel({
      couponCode,
      description,
      validforAll,
      expiryDate: timeStampExpiry,
      effectiveDate: timeStampEffective,
      minimumOrderValue,
      usageLimit,
      firstTimeUser,

      discountPercentage,
    });
    const saveData = await newCouponCode.save();

    // if (validforAll == true) {
    //   const getUser = await User.update({ userType: "Individual" });
    //   const getmetaData = await User.aggregate([
    //     { $match: { userType: "Individual" } },
    //     {
    //       $lookup: {
    //         from: "usermetadatas",
    //         localField: "_id",
    //         foreignField: "userId",
    //         as: "updatedData",
    //       },
    //     },
    //     { $set: { discountCodes: { coupons: [saveData] } } },
    //   ]);
    //   console.log("54", getmetaData);
    // }

    res.status(200).json({ message: "Discount coupon created successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create discount coupon code." });
  }
};

// this function returns the discount object acc. to the id
exports.getDiscount = async (req, res) => {
  try {
    let data = await DiscountModel.findById(req.params._id);
    if (!data) {
      return res.status(404).json({ message: "Discount coupon not found." });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to retrieve discount coupon information." });
  }
};

//  this function returns all the discount coupons object
//  for the admin dashboard
exports.getAllDiscount = async (req, res) => {
  try {
    let data = await DiscountModel.find().sort("-createdAt");
    if (data.length == 0) {
      return res.status(404).json({ message: "No discount coupon found." });
    }
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to retrieve all discount coupon information." });
  }
};

// Fetch the discount and check if the coupon exists or expired,
//  apply to a cart,
//  it returns a percentage value which should be discounted
exports.applyDiscount = async (req, res) => {
  try {
    const getCoupon = req.body.coupon;
    const userId = req.body.userId;
    const checkCoupon = await DiscountModel.findOne({ couponCode: getCoupon });
    const todaysDate = Date.now();

    // check user type if coupon is applicable or not
    if (userId !== null) {
      const user = await User.findOne({ _id: userId });
      if (
        user.userType == "Employee" ||
        user.userType == "Veteran" ||
        user.userType == "Ambassador"
      ) {
        return res
          .status(400)
          .json({ message: "Coupon is not valid for this user" });
      }
    }

    if (checkCoupon) {
      // check if coupon exists in database
      if (Number(checkCoupon.expiryDate) > Number(todaysDate)) {
        // check if coupon is expired or not
        if (checkCoupon.effectiveDate <= todaysDate) {
          // check effective date
          if (checkCoupon.validforAll == true) {
            res.status(200).json({
              percentOff: checkCoupon.discountPercentage,
              message: "coupon exists",
            });
          } else {
            if (userId) {
              // to check if there is any previous order exists for the user
              const checkPreviousOrder = await Order.find({
                user: userId,
                isPaid: true,
              });
              if (checkPreviousOrder.length > 0) {
                console.log(checkPreviousOrder.length);
                res.status(400).json({
                  message:
                    "This coupon is valid only for the first time users.",
                });
              } else {
                res.status(200).json({
                  percentOff: checkCoupon.discountPercentage,
                  message: "coupon exists",
                });
              }
            } else {
              res
                .status(400)
                .json({ message: "Please login to use this coupon." });
            }
          }
        } else {
          res.status(400).json({
            message: "Coupon is not valid ",
          });
        }
      } else {
        res.status(400).json({
          message: "Coupon expired",
        });
      }
    } else {
      res.status(400).json({
        message: "This coupon doesn't exist",
      });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// this function deletes the coupons from the admin dashboard acc. to the id
exports.deleteDiscount = async (req, res) => {
  try {
    let data = await DiscountModel.deleteOne({ _id: req.body.id });
    if (data.deletedCount === 0) {
      return res.status(404).json({ message: "Discount coupon not found." });
    }
    res.status(200).json({ message: "Discount coupon deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete discount coupon." });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const {
      description,
      validforAll,
      effectiveDate,
      expiryDate,
      discountPercentage,
    } = req.body;

    const getDate = effectiveDate; // date format MM-DD-YYYY
    const convertDate = new Date(getDate);
    const timeStampEffective = convertDate.getTime();

    const getDate1 = expiryDate; // date format MM-DD-YYYY
    const convertDate1 = new Date(getDate1);
    const timeStampExpiry =
      Number(convertDate1.getTime()) + Number(process.env.TIME_ZONE);

    const updatedFields = {
      description,
      validforAll,
      expiryDate: timeStampExpiry,
      effectiveDate: timeStampEffective,
      discountPercentage,
    };

    if (timeStampExpiry < timeStampEffective) {
      return res.status(404).json({
        message: "Expiry date should be greater than effective date.",
      });
    }

    let data = await DiscountModel.find(req.params);
    let updatedData = await DiscountModel.updateOne(req.params, {
      $set: updatedFields,
    });
    if (data.length == 0) {
      return res.status(404).json({ message: "Discount coupon not found." });
    }
    if (updatedData.nModified === 0) {
      return res
        .status(404)
        .json({ message: "No new value selected to update Discount coupon" });
    } else {
      res
        .status(200)
        .json({ message: "Discount coupon updated successfully." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update discount coupon." });
  }
};

// To create discount for veteran, ambassador, ambRef, employee
// creating coupons on stripe and storing to the database
exports.createUserTypeDiscount = async (req, res) => {
  try {
    const { userType, discountPercent } = req.body;
    const checkModel = await UserTypeDiscount.find({});

    if (userType === "Ambassador" && discountPercent > 0) {
      const arrayValue = [5, 8, 10, 12];
      if (checkModel.length !== 0) {
        if (checkModel[0].ambassador.discountPercent != null) {
          const getFirstDiscount = checkModel[0].ambassador.discountPercent;
          const discountArray = [
            "AMB" + getFirstDiscount,
            "AMB" + (getFirstDiscount + 5),
            "AMB" + (getFirstDiscount + 8),
            "AMB" + (getFirstDiscount + 10),
            "AMB" + (getFirstDiscount + 12),
          ];
          for (i = 0; i < 5; i++) {
            const deleted = await stripe.coupons.del(String(discountArray[i]));
          }
        }
      }

      for (i = 0; i < 5; i++) {
        if (i == 0) {
          const createCoupon = await stripe.coupons.create({
            percent_off: discountPercent,
            duration: "forever",
            name: "AMB" + discountPercent,
            id: "AMB" + discountPercent,
            applies_to: {
              products: [
                process.env.STRIPE_PRODUCT_ID_MAGMA12,
                process.env.STRIPE_PRODUCT_ID_GLACIER12,
              ],
            },
          });
        } else if (i > 0) {
          const createCoupon = await stripe.coupons.create({
            percent_off: discountPercent + arrayValue[i - 1],
            duration: "forever",
            name: "AMB" + (discountPercent + arrayValue[i - 1]),
            id: "AMB" + (discountPercent + arrayValue[i - 1]),
            applies_to: {
              products: [
                process.env.STRIPE_PRODUCT_ID_MAGMA12,
                process.env.STRIPE_PRODUCT_ID_GLACIER12,
              ],
            },
          });
        }
      }
      const getData = await UserTypeDiscount.findOne({
        "ambassador.userType": "Ambassador",
      });
      if (!getData) {
        const createCoupons = new UserTypeDiscount({
          "ambassador.discountPercent": discountPercent,
          "ambassador.stripeFirstSubs": "AMB" + discountPercent,
          "ambassador.stripe1Qty": "AMB" + (discountPercent + 5),
          "ambassador.stripe2Qty": "AMB" + (discountPercent + 8),
          "ambassador.stripe3Qty": "AMB" + (discountPercent + 10),
          "ambassador.stripe4Qty": "AMB" + (discountPercent + 12),
        });
        await createCoupons.save();
      } else {
        const updateDb = await UserTypeDiscount.updateOne(
          { "ambassador.userType": "Ambassador" },
          {
            $set: {
              "ambassador.discountPercent": discountPercent,
              "ambassador.stripeFirstSubs": "AMB" + discountPercent,
              "ambassador.stripe1Qty": "AMB" + (discountPercent + 5),
              "ambassador.stripe2Qty": "AMB" + (discountPercent + 8),
              "ambassador.stripe3Qty": "AMB" + (discountPercent + 10),
              "ambassador.stripe4Qty": "AMB" + (discountPercent + 12),
            },
          }
        );
      }

      const updateAllAmbassadorDiscount = await AmbassadorMetaModel.updateMany(
        {},
        { $set: { discountPercent: discountPercent } }
      );

      res.status(200).json({ message: "coupons created" });
    } else if (userType === "Veteran" && discountPercent > 0) {
      const arrayValue = [5, 8, 10, 12];
      if (checkModel.length !== 0) {
        if (checkModel[0].veteran.discountPercent != null) {
          const getFirstDiscount = checkModel[0].veteran.discountPercent;
          const discountArray = [
            "VET" + getFirstDiscount,
            "VET" + (getFirstDiscount + 5),
            "VET" + (getFirstDiscount + 8),
            "VET" + (getFirstDiscount + 10),
            "VET" + (getFirstDiscount + 12),
          ];
          for (i = 0; i < 5; i++) {
            const deleted = await stripe.coupons.del(String(discountArray[i]));
          }
        }
      }

      for (i = 0; i < 5; i++) {
        if (i == 0) {
          const createCoupon = await stripe.coupons.create({
            percent_off: discountPercent,
            duration: "forever",
            name: "VET" + discountPercent,
            id: "VET" + discountPercent,
            applies_to: {
              products: [
                process.env.STRIPE_PRODUCT_ID_MAGMA12,
                process.env.STRIPE_PRODUCT_ID_GLACIER12,
              ],
            },
          });
        } else if (i > 0) {
          const createCoupon = await stripe.coupons.create({
            percent_off: discountPercent + arrayValue[i - 1],
            duration: "forever",
            name: "VET" + (discountPercent + arrayValue[i - 1]),
            id: "VET" + (discountPercent + arrayValue[i - 1]),
            applies_to: {
              products: [
                process.env.STRIPE_PRODUCT_ID_MAGMA12,
                process.env.STRIPE_PRODUCT_ID_GLACIER12,
              ],
            },
          });
        }
      }
      const getData = await UserTypeDiscount.findOne({
        "veteran.userType": "Veteran",
      });
      if (!getData) {
        const createCoupons = new UserTypeDiscount({
          "veteran.discountPercent": discountPercent,
          "veteran.stripeFirstSubs": "VET" + discountPercent,
          "veteran.stripe1Qty": "VET" + (discountPercent + 5),
          "veteran.stripe2Qty": "VET" + (discountPercent + 8),
          "veteran.stripe3Qty": "VET" + (discountPercent + 10),
          "veteran.stripe4Qty": "VET" + (discountPercent + 12),
        });
        await createCoupons.save();
      } else {
        const updateDb = await UserTypeDiscount.updateOne(
          { "veteran.userType": "Veteran" },
          {
            $set: {
              "veteran.discountPercent": discountPercent,
              "veteran.stripeFirstSubs": "VET" + discountPercent,
              "veteran.stripe1Qty": "VET" + (discountPercent + 5),
              "veteran.stripe2Qty": "VET" + (discountPercent + 8),
              "veteran.stripe3Qty": "VET" + (discountPercent + 10),
              "veteran.stripe4Qty": "VET" + (discountPercent + 12),
            },
          }
        );
      }

      const updateAllVeteranDiscount = await UserMetaModel.find({});
      updateAllVeteranDiscount.forEach(async (res) => {
        if (res.veteran.id) {
          await UserMetaModel.updateOne(
            { _id: res._id },
            {
              $set: {
                "veteran.discountPercentOrder": discountPercent,
                "veteran.discountPercentSubscription": discountPercent,
              },
            }
          );
        }
      });

      res.status(200).json({ message: "coupons created" });
    } else if (userType === "Employee" && discountPercent > 0) {
      if (checkModel.length !== 0) {
        if (checkModel[0].employee.discountPercent != null) {
          const getFirstDiscount = checkModel[0].employee.discountPercent;
          const discountArray = ["EMP" + getFirstDiscount];

          const deleted = await stripe.coupons.del(String(discountArray[0]));
        }
      }
      const createCoupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "forever",
        name: "EMP" + discountPercent,
        id: "EMP" + discountPercent,
        applies_to: {
          products: [
            process.env.STRIPE_PRODUCT_ID_MAGMA12,
            process.env.STRIPE_PRODUCT_ID_GLACIER12,
          ],
        },
      });
      const getData = await UserTypeDiscount.findOne({
        "employee.userType": "Employee",
      });
      if (!getData) {
        const createCoupons = new UserTypeDiscount({
          "employee.discountPercent": discountPercent,
          "employee.stripeFirstSubs": "EMP" + discountPercent,
          "employee.stripe1Qty": "EMP" + discountPercent,
          "employee.stripe2Qty": "EMP" + discountPercent,
          "employee.stripe3Qty": "EMP" + discountPercent,
          "employee.stripe4Qty": "EMP" + discountPercent,
        });
        await createCoupons.save();
      } else {
        const updateDb = await UserTypeDiscount.updateOne(
          { "employee.userType": "Employee" },
          {
            $set: {
              "employee.discountPercent": discountPercent,
              "employee.stripeFirstSubs": "EMP" + discountPercent,
              "employee.stripe1Qty": "EMP" + discountPercent,
              "employee.stripe2Qty": "EMP" + discountPercent,
              "employee.stripe3Qty": "EMP" + discountPercent,
              "employee.stripe4Qty": "EMP" + discountPercent,
            },
          }
        );
      }

      const updateAllEmployeeDiscount = await UserMetaModel.find({});
      updateAllEmployeeDiscount.forEach(async (res) => {
        if (res.employee.id) {
          console.log(res.employee);
          await UserMetaModel.updateOne(
            { _id: res._id },
            {
              $set: {
                "employee.discountPercentOrder": discountPercent,
                "employee.discountPercentSubscription": discountPercent,
              },
            }
          );
        }
      });
      res.status(200).json({ message: "coupons created" });
    } else if (userType === "AmbassadorReferral" && discountPercent > 0) {
      if (checkModel.length !== 0) {
        if (checkModel[0].ambassadorReferral.discountPercent != null) {
          let checkDiscount;
          const getDiscount =
            checkModel[0].ambassadorReferral.discountPercentArray;
          for (i = 0; i < getDiscount.length; i++) {
            if (getDiscount[i] === "AMBREF" + String(discountPercent)) {
              checkDiscount = getDiscount[i];
              break;
            }
          }
          if (checkDiscount) {
            const updateDb = await UserTypeDiscount.updateOne(
              { "ambassadorReferral.userType": "AmbassadorReferral" },
              {
                $set: {
                  "ambassadorReferral.discountPercent": discountPercent,
                  "ambassadorReferral.stripeFirstSubs":
                    "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe1Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe2Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe3Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe4Qty": "AMBREF" + discountPercent,
                },
              }
            );
          } else {
            const createCoupon = await stripe.coupons.create({
              percent_off: discountPercent,
              duration: "forever",
              name: "AMBREF" + discountPercent,
              id: "AMBREF" + discountPercent,
              applies_to: {
                products: [
                  process.env.STRIPE_PRODUCT_ID_MAGMA12,
                  process.env.STRIPE_PRODUCT_ID_GLACIER12,
                ],
              },
            });

            const updateDb = await UserTypeDiscount.updateOne(
              { "ambassadorReferral.userType": "AmbassadorReferral" },
              {
                $set: {
                  "ambassadorReferral.discountPercent": discountPercent,
                  "ambassadorReferral.stripeFirstSubs":
                    "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe1Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe2Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe3Qty": "AMBREF" + discountPercent,
                  "ambassadorReferral.stripe4Qty": "AMBREF" + discountPercent,
                },
                $push: {
                  "ambassadorReferral.discountPercentArray":
                    "AMBREF" + String(discountPercent),
                },
              }
            );
          }
        } else {
          const createCoupon = await stripe.coupons.create({
            percent_off: discountPercent,
            duration: "forever",
            name: "AMBREF" + discountPercent,
            id: "AMBREF" + discountPercent,
            applies_to: {
              products: [
                process.env.STRIPE_PRODUCT_ID_MAGMA12,
                process.env.STRIPE_PRODUCT_ID_GLACIER12,
              ],
            },
          });

          const updateDb = await UserTypeDiscount.updateOne(
            {},
            {
              $set: {
                "ambassadorReferral.userType": "AmbassadorReferral",
                "ambassadorReferral.discountPercent": discountPercent,
                "ambassadorReferral.stripeFirstSubs":
                  "AMBREF" + discountPercent,
                "ambassadorReferral.stripe1Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe2Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe3Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe4Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.discountPercentArray": [
                  "AMBREF" + String(discountPercent),
                ],
              },
            }
          );
        }
      } else {
        const createCoupon = await stripe.coupons.create({
          percent_off: discountPercent,
          duration: "forever",
          name: "AMBREF" + discountPercent,
          id: "AMBREF" + discountPercent,
          applies_to: {
            products: [
              process.env.STRIPE_PRODUCT_ID_MAGMA12,
              process.env.STRIPE_PRODUCT_ID_GLACIER12,
            ],
          },
        });
        const getData = await UserTypeDiscount.findOne({
          "ambassadorReferral.userType": "AmbassadorReferral",
        });
        if (!getData) {
          const createCoupons = new UserTypeDiscount({
            "ambassadorReferral.discountPercent": discountPercent,
            "ambassadorReferral.stripeFirstSubs": "AMBREF" + discountPercent,
            "ambassadorReferral.stripe1Qty": "AMBREF" + discountPercent,
            "ambassadorReferral.stripe2Qty": "AMBREF" + discountPercent,
            "ambassadorReferral.stripe3Qty": "AMBREF" + discountPercent,
            "ambassadorReferral.stripe4Qty": "AMBREF" + discountPercent,
          });
          await createCoupons.save();

          const updateArray = await UserTypeDiscount.updateOne(
            {
              _id: createCoupons._id,
            },
            {
              $push: {
                "ambassadorReferral.discountPercentArray":
                  "AMBREF" + String(discountPercent),
              },
            }
          );
        } else {
          const updateDb = await UserTypeDiscount.updateOne(
            { "ambassadorReferral.userType": "AmbassadorReferral" },
            {
              $set: {
                "ambassadorReferral.discountPercent": discountPercent,
                "ambassadorReferral.stripeFirstSubs":
                  "AMBREF" + discountPercent,
                "ambassadorReferral.stripe1Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe2Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe3Qty": "AMBREF" + discountPercent,
                "ambassadorReferral.stripe4Qty": "AMBREF" + discountPercent,
              },
              $push: {
                "ambassadorReferral.discountPercentArray":
                  "AMBREF" + String(discountPercent),
              },
            }
          );
        }
      }
      res.status(200).json({ message: "coupons created" });
    } else if (userType === "Test" && discountPercent > 0) {
      if (checkModel.length !== 0) {
        if (checkModel[0].test.discountPercent != null) {
          const getFirstDiscount = checkModel[0].test.discountPercent;
          const discountArray = ["TEST" + getFirstDiscount];

          const deleted = await stripe.coupons.del(String(discountArray[0]));
        }
      }
      const createCoupon = await stripe.coupons.create({
        percent_off: discountPercent,
        duration: "forever",
        name: "TEST" + discountPercent,
        id: "TEST" + discountPercent,
        applies_to: {
          products: [
            process.env.STRIPE_PRODUCT_ID_MAGMA12,
            process.env.STRIPE_PRODUCT_ID_GLACIER12,
          ],
        },
      });
      const getData = await UserTypeDiscount.findOne({
        "test.userType": "Test",
      });
      if (checkModel[0].length == 0) {
        const createCoupons = new UserTypeDiscount({
          "test.discountPercent": discountPercent,
          "test.stripeFirstSubs": "TEST" + discountPercent,
          "test.stripe1Qty": "TEST" + discountPercent,
          "test.stripe2Qty": "TEST" + discountPercent,
          "test.stripe3Qty": "TEST" + discountPercent,
          "test.stripe4Qty": "TEST" + discountPercent,
        });
        await createCoupons.save();
      } else if (!getData) {
        const createCoupons = await UserTypeDiscount.updateOne(
          {},
          {
            $set: {
              "test.userType": "Test",
              "test.discountPercent": discountPercent,
              "test.stripeFirstSubs": "TEST" + discountPercent,
              "test.stripe1Qty": "TEST" + discountPercent,
              "test.stripe2Qty": "TEST" + discountPercent,
              "test.stripe3Qty": "TEST" + discountPercent,
              "test.stripe4Qty": "TEST" + discountPercent,
            },
          }
        );
      } else {
        const updateDb = await UserTypeDiscount.updateOne(
          { "test.userType": "Test" },
          {
            $set: {
              "test.discountPercent": discountPercent,
              "test.stripeFirstSubs": "TEST" + discountPercent,
              "test.stripe1Qty": "TEST" + discountPercent,
              "test.stripe2Qty": "TEST" + discountPercent,
              "test.stripe3Qty": "TEST" + discountPercent,
              "test.stripe4Qty": "TEST" + discountPercent,
            },
          }
        );
      }

      const updateAllTestDiscount = await UserMetaModel.find({});
      updateAllTestDiscount.forEach(async (res) => {
        if (res.test.id) {
          console.log(res.test);
          await UserMetaModel.updateOne(
            { _id: res._id },
            {
              $set: {
                "test.discountPercentOrder": discountPercent,
                "test.discountPercentSubscription": discountPercent,
              },
            }
          );
        }
      });
      res.status(200).json({ message: "coupons created" });
    }
  } catch (error) {
    res.status(400).json({ err: error.message });
  }
};

exports.getAllUserTypeDiscount = async (req, res) => {
  try {
    const getData = await UserTypeDiscount.find({});
    res.status(200).json({ discountData: getData });
  } catch (error) {
    res.status(400).json({ err: error.message });
  }
};
