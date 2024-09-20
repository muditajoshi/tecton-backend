const User = require("../models/userModel");
const ProductIds = require("../models/productIdModel");
const Order = require("../models/orderModel");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const UserTypeDiscountModel = require("../models/userTypeDiscountModel");
const Stripe = require("stripe");
const UserMetaData = require("../models/userMetaModel");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Subscription = require("../models/subscriptionModel");
// To apply different discount coupons on subscription according to their userType

const UserTypeSubsDiscount = async ({
  orderItemsObjectId,
  orderId,
  stripeCustomerId,
  paymentMethod,
  getPriceId,
  itemsQuantity,
  findShippingId,
  userType,
  taxCode,
  itemCode,
}) => {
  try {
    let subscription;
    let discountCoupon;
    const getOrderData = await Order.findOne({ _id: orderId });

    const userData = await UserMetaData.findOne({ userId: getOrderData.user });

    if (userType == "Ambassador") {
      var getAmbassadorMeta = await AmbassadorMetaData.findOne({
        userId: getOrderData.user,
      });
    }
    const checkDiscount = await UserTypeDiscountModel.find({});
    if (userType == "Ambassador" && getAmbassadorMeta) {
      discountCoupon = checkDiscount[0].ambassador.stripeFirstSubs;
    } else if (userType == "Employee" && userData.employee.isApproved == true) {
      discountCoupon = checkDiscount[0].employee.stripeFirstSubs;
    } else if (userType == "Veteran" && userData.veteran.isApproved == true) {
      discountCoupon = checkDiscount[0].veteran.stripeFirstSubs;
    } else if (userType == "Test") {
      discountCoupon = checkDiscount[0].test.stripeFirstSubs;
    }
    if (findShippingId) {
      subscription = await stripe.subscriptions.create({
        metadata: {
          tectonSubscriptionId: String(orderItemsObjectId),
          tectonOrderId: orderId,
          // TaxCode: taxCode,
          // ItemCode: itemCode,
        },
        customer: stripeCustomerId,
        proration_behavior: "none",
        default_payment_method: paymentMethod,
        coupon: discountCoupon,
        pay_immediately: false,
        expand: ["latest_invoice.payment_intent"],
        items: [
          {
            price: getPriceId,
            quantity: itemsQuantity,
          },
          { price: findShippingId, quantity: 1 },
        ],
      });
    } else {
      subscription = await stripe.subscriptions.create({
        metadata: {
          tectonSubscriptionId: String(orderItemsObjectId),
          tectonOrderId: orderId,
          // TaxCode: taxCode,
          // ItemCode: itemCode,
        },
        customer: stripeCustomerId,
        proration_behavior: "none",
        default_payment_method: paymentMethod,
        coupon: discountCoupon,
        pay_immediately: false,
        expand: ["latest_invoice.payment_intent"],
        items: [{ price: getPriceId, quantity: itemsQuantity }],
      });
    }
    return subscription;
  } catch (err) {
    return err.message;
  }
};

const futureSubsDiscount = async ({
  subscriptionId,
  quantity,
  userType,
  userId,
}) => {
  try {
    const userData = await UserMetaData.findOne({ userId: userId });
    if (userType == "Ambassador") {
      var getAmbassadorMeta = await AmbassadorMetaData.findOne({
        userId: userId,
      });
    }
    const checkDiscount = await UserTypeDiscountModel.find({});
    if (userType == "Ambassador" && getAmbassadorMeta) {
      discountCoupon = checkDiscount[0].ambassador;
    } else if (userType == "Employee" && userData.employee.isApproved == true) {
      discountCoupon = checkDiscount[0].employee;
    } else if (userType == "Veteran" && userData.veteran.isApproved == true) {
      discountCoupon = checkDiscount[0].veteran;
    } else if (userType == "Test") {
      discountCoupon = checkDiscount[0].test;
    } else {
      if (quantity === 1) {
        discountCoupon = { stripeFirstSubs: process.env.QTY1 };
      } else if (quantity === 2) {
        discountCoupon = { stripeFirstSubs: process.env.QTY2 };
      } else if (quantity === 3) {
        discountCoupon = { stripeFirstSubs: process.env.QTY3 };
      } else if (quantity >= 4) {
        discountCoupon = { stripeFirstSubs: process.env.QTY4 };
      }
    }

    if (quantity === 1) {
      const subscriptionUpdate = await stripe.subscriptions.update(
        subscriptionId,
        { coupon: discountCoupon.stripeFirstSubs }
      );
    } else if (quantity === 2) {
      const subscriptionUpdate = await stripe.subscriptions.update(
        subscriptionId,
        { coupon: discountCoupon.stripeFirstSubs }
      );
    } else if (quantity === 3) {
      const subscriptionUpdate = await stripe.subscriptions.update(
        subscriptionId,
        { coupon: discountCoupon.stripeFirstSubs }
      );
    } else if (quantity >= 4) {
      const subscriptionUpdate = await stripe.subscriptions.update(
        subscriptionId,
        { coupon: discountCoupon.stripeFirstSubs }
      );
    }
    return "Subscription Updated Successfully";
  } catch (error) {
    return error.message;
  }
};

module.exports = { UserTypeSubsDiscount, futureSubsDiscount };
