const Stripe = require("stripe");
const dotenv = require("dotenv");
const User = require("../models/userModel");
const paymentMethodModel = require("../models/paymentMethodModel");
const { v4: uuidv4 } = require("uuid");
const externalIdModel = require("../models/externalId");
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPaymentMethod = async (req, res) => {
  try {
    console.log("12-----------", req.body);
    const { state, city, country, address, apt, postalCode } =
      req.body.billingAddress;
    const cardNumber = req.body.cardNumber;
    const expMonth = req.body.expMonth;
    const expYear = req.body.expYear;
    const cvc = req.body.cvc;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    let customerId = req.body.customerId;
    const defaultPaymentMethod = req.body.defaultPaymentMethod;
    const savePaymentMethod = req.body.savePaymentMethod;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email,
        name: firstName + " " + lastName,
        description: "customer created",
      });

      customerId = customer.id;
      const updatedUserId = await User.updateOne(
        { _id: req.user._id },
        { $set: { stripeCustomerId: customerId } }
      );

      const findId = await externalIdModel.find({
        externalId: { $elemMatch: { id: req.user._id } },
      });
      if (findId.length < 1) {
        const collectionID = uuidv4();
        const getdata = [
          { id: req.user._id, name: "TECTON" },
          { id: customerId, name: "STRIPE" },
        ];
        const saveId = new externalIdModel({
          externalId: getdata,
          id: collectionID,
          idType: "CUSTOMER",
        });
        const dbID = await saveId.save();
      } else {
        const getData = { id: customerId, name: "STRIPE" };
        if (findId.length > 0) {
          findId[0].externalId = [...findId[0].externalId, getData];
          const data = await findId[0].save();
        }
      }
    }

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: cardNumber,
        exp_month: expMonth,
        exp_year: expYear,
        cvc: cvc,
      },
      billing_details: {
        address: {
          city: city,
          postal_code: postalCode,
          state: state,
          line1: address,
          line2: apt,
          country: country,
        },
        email: email,
        name: firstName + " " + lastName,
      },
    }); //new code start

    //check if already exists

    const payment = await stripe.customers.listPaymentMethods(customerId, {
      type: "card",
    });

    let fingerprintExists;
    if (payment.data.length < 1) {
      fingerprintExists = false;
    }

    let index = 0;
    for (let i = 0; i < payment.data.length; i++) {
      if (paymentMethod.card.fingerprint == payment.data[i].card.fingerprint) {
        fingerprintExists = true;
        break;
      } else {
        fingerprintExists = false;
      }
      index += 1;
    }

    if (fingerprintExists == false && savePaymentMethod == true) {
      const paymentMethodId = paymentMethod.id;
      const attachPaymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        { customer: customerId }
      );
      const paymentMethods = await stripe.customers.listPaymentMethods(
        customerId,
        { type: "card" }
      );
      const getData = await paymentMethodModel.find({ userId: req.user._id });

      if (getData.length < 1) {
        const storePaymentMethods = new paymentMethodModel({
          userId: req.user._id,
          paymentMethods: paymentMethods,
        });
        if (defaultPaymentMethod == true) {
          storePaymentMethods.defaultPaymentMethod = paymentMethodId;
          const saveData = await storePaymentMethods.save();
        }
        const saveData = await storePaymentMethods.save();
        res.status(200).json({ data: attachPaymentMethod });
      } else {
        if (defaultPaymentMethod == true) {
          const storeData = await paymentMethodModel.updateOne(
            { userId: req.user._id },
            {
              $set: {
                paymentMethods: paymentMethods,
                defaultPaymentMethod: paymentMethodId,
              },
            }
          );
        } else {
          const storeData = await paymentMethodModel.updateOne(
            { userId: req.user._id },
            {
              $set: { paymentMethods: paymentMethods },
            }
          );
        }

        res.status(200).json({ data: attachPaymentMethod });
      }
    } else if (fingerprintExists == true) {
      res.status(200).json({
        data: payment.data[index],
      });
    } else if (fingerprintExists == false && savePaymentMethod == false) {
      res.status(200).json({
        data: paymentMethod,
      });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAllPaymentMethods = async (req, res) => {
  try {
    const userId = req.user._id;
    const paymentMethods = await paymentMethodModel.find({ userId: userId });
    res.status(200).json({ data: paymentMethods });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.detachPaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.body.paymentMethodId;
    const customerId = req.body.customerId;
    const subscriptionList = await stripe.subscriptions.list({
      customer: customerId,
    });

    let matchPaymentMethod;
    subscriptionList.data.forEach((data) => {
      if (data.default_payment_method == paymentMethodId) {
        matchPaymentMethod = paymentMethodId;
      }
    });
    if (matchPaymentMethod) {
      return res.status(400).json({
        message:
          "This card cannot be deleted as it is attached to your subscription",
      });
    } else {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      const paymentMethods = await stripe.customers.listPaymentMethods(
        customerId,
        { type: "card" }
      );
      const getData = await paymentMethodModel.find({ userId: req.user._id });
      console.log(getData);
      if (getData.length < 1) {
        res.status(404).json({ message: "Payment method not found" });
      } else {
        if (paymentMethodId == getData[0].defaultPaymentMethod) {
          const removeDefaultPm = await paymentMethodModel.updateOne(
            { userId: req.user._id },
            { $unset: { defaultPaymentMethod: 1 } }
          );
        }
        const storeData = await paymentMethodModel.updateOne(
          { userId: req.user._id },
          {
            $set: { paymentMethods: paymentMethods },
          }
        );
        res.status(200).json({ data: paymentMethods });
      }
    }
  } catch (err) {
    res.status(400).json({ messge: err.message });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.body.paymentMethodId;
    const customerId = req.body.customerId;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const defaultPaymentMethod = req.body.defaultPaymentMethod;
    const { state, city, country, address, apt, postalCode } =
      req.body.billingAddress;
    const paymentMethod = await stripe.paymentMethods.update(paymentMethodId, {
      billing_details: {
        name: firstName + " " + lastName,
        address: {
          city: city,
          postal_code: postalCode,
          state: state,
          line1: address,
          line2: apt,
          country: country,
        },
      },
    });
    const paymentMethods = await stripe.customers.listPaymentMethods(
      customerId,
      { type: "card" }
    );
    const storeData = await paymentMethodModel.updateOne(
      { userId: req.user._id },
      {
        $set: { paymentMethods: paymentMethods },
      }
    );
    if (defaultPaymentMethod == true) {
      const storeData = await paymentMethodModel.updateOne(
        { userId: req.user._id },
        {
          $set: {
            defaultPaymentMethod: paymentMethodId,
          },
        }
      );
    }
    res.status(200).json({ data: paymentMethod });
  } catch (err) {
    res.status(400).json({ messge: err.message });
  }
};

exports.getPaymentMethod = async (req, res) => {
  try {
    const paymentMethodId = req.body.paymentMethodId;
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    res.status(200).json({ data: paymentMethod });
  } catch (err) {
    res.status(400).json({ messge: err.message });
  }
};
