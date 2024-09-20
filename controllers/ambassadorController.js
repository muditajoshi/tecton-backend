const Ambassador = require("../models/ambassador");
const sendMail = require("../utils/sendMail.js");
const {
  applicationAccepted,
  applicationReceived,
  applicationRejected,
} = require("../utils/ambassadorEmail.js");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const externalIdModel = require("../models/externalId");
const generateToken = require("../utils/generateToken.js");
const generateGravatar = require("../utils/generateGravatar.js");
const UserTypeDiscountModel = require("../models/userTypeDiscountModel");
const { v4: uuidv4 } = require("uuid");
const dotenv = require("dotenv");
const Stripe = require("stripe");
dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const User = require("../models/userModel");

exports.createAmbassador = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const firstNameCamelCase = req.body.firstName;
    const lastNameCamelCase = req.body.lastName;
    const firstName =
      firstNameCamelCase.charAt(0).toUpperCase() +
      firstNameCamelCase.slice(1).toLowerCase();
    const lastName =
      lastNameCamelCase.charAt(0).toUpperCase() +
      lastNameCamelCase.slice(1).toLowerCase();
    const where_did_you_hear_about_tecton =
      req.body.where_did_you_hear_about_tecton;
    const twitter_handle = req.body.twitter_handle;
    const instagram_handle = req.body.instagram_handle;
    const tiktok_handle = req.body.tiktok_handle;
    const other_social_medial_link = req.body.other_social_media_link;
    const short_bio = req.body.short_bio;
    const street_address = req.body.street_address;
    const city = req.body.city;
    const state = req.body.state;
    const postal_code = req.body.postal_code;
    const country = req.body.country;
    if (
      isNaN(
        firstName,
        lastName,
        email,
        where_did_you_hear_about_tecton,
        short_bio,
        street_address,
        city,
        state,
        postal_code,
        country
      )
    ) {
      const checkUser = await User.find({ email: email });

      if (checkUser.length > 0) {
        return res.status(403).json({ message: "user already exists" });
      }

      const data = new Ambassador({
        firstName: firstName,
        lastName: lastName,
        email: email,
        where_did_you_hear_about_tecton: where_did_you_hear_about_tecton,
        twitter_handle: twitter_handle,
        instagram_handle: instagram_handle,
        tiktok_handle: tiktok_handle,
        other_social_medial_link: other_social_medial_link,
        short_bio: short_bio,
        street_address: street_address,
        city: city,
        state: state,
        postal_code: postal_code,
        country: country,
      });
      const newData = await data.save();

      // Creating user from the ambassador data code start

      const userExists = await User.findOne({ email });

      if (userExists) {
        res.status(400);
        throw new Error("Email already registered");
      }

      // the gravatar will be unique for each registered email
      const avatar = generateGravatar(email);

      // customer created on stripe start
      const customer = await stripe.customers.create({
        email: email,
        name: firstName + " " + lastName,
        description: "customer created",
      });
      // customer created on stripe end

      //  generate password code start
      const password = (Math.random() * 1e16).toString(36);
      //  generate password code end

      const socialMedia = [
        {
          twitter: { id: twitter_handle },
          instagram: { id: instagram_handle },
          tiktok: { id: tiktok_handle },
          otherSocialMediaLink: { id: other_social_medial_link },
        },
      ];

      const user = await User.create({
        firstName,
        lastName,
        email,
        password,
        avatar,
        "shippingAddress.address1": street_address,
        "shippingAddress.city": city,
        "shippingAddress.state": state,
        "shippingAddress.zip": postal_code,
        "shippingAddress.country": country,
        "billingAddress.firstName": firstName,
        "billingAddress.lastName": lastName,
        "billingAddress.email": email,
        "billingAddress.address1": street_address,
        "billingAddress.city": city,
        "billingAddress.state": state,
        "billingAddress.zip": postal_code,
        "billingAddress.country": country,
        socialMedia: socialMedia,
        termsAndConditions: true,
        stripeCustomerId: customer.id,
      });

      // if user was created successfully
      if (user) {
        // send a mail for email verification of the newly registred email id
        // await sendMail(user._id, email, "email verification");

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

        // External ID code end
      } else {
        throw new Error("User not created");
      }
      // Creating user from the ambassador data code end
      // application received email
      applicationReceived({
        email,
        firstName,
        lastName,
      });
      res.status(200).json({ status: "success", ambassador_data: newData });
    } else {
      res.status(422).json({ err: "Invalid Data" });
    }
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

exports.updateAmbassadorData = async (req, res) => {
  try {
    const email = req.body.email;
    const approved = req.body.approved;

    if (approved == true) {
      const findUser = await User.find({ email: email });
      const findAmbassador = await Ambassador.findOne({ email: email });
      if (findUser.length < 1) {
        res.status(404).json({ message: "user not found" });
      } else {
        const getDiscount = await UserTypeDiscountModel.find({});
        const ambDiscount = getDiscount[0].ambassador.discountPercent;
        findUser[0].userType = ["Ambassador"];
        findUser[0].isConfirmed = true;
        await findUser[0].save();

        const refCodeGeneration = new Date();
        const codeGenerated = refCodeGeneration.getTime();
        console.log(codeGenerated);
        const addAmbassadorMeta = new AmbassadorMetaData({
          userId: findUser[0]._id,
          refCode: String(codeGenerated),
          ambassadorId: findAmbassador._id,
          discountPercent: ambDiscount,
        });
        await addAmbassadorMeta.save();
        const updateAmbassadorData = await Ambassador.findOneAndUpdate(
          {
            email: email,
          },
          {
            $set: { approval: "approved" },
          }
        );
        const updateExternalid = await externalIdModel.update(
          {
            "externalId.id": findUser[0]._id,
          },
          { $set: { idType: "AMBASSADOR" } }
        );
        // application accepted email
        let firstName = findUser[0].firstName;
        let lastName = findUser[0].lastName;
        applicationAccepted({
          email,
          firstName,
          lastName,
        });
        // forgot password email
        const sendemail = await sendMail(
          findUser[0]._id,
          email,
          "forgot password"
        );

        res.status(200).json({ data: addAmbassadorMeta });
      }
    } else if (approved == false) {
      const findUser = await User.find({ email: email });
      if (findUser.length < 1) {
        res.status(404).json({ message: "user not found" });
      } else {
        findUser[0].userType = ["Individual"];
        findUser[0].isConfirmed = true;
        await findUser[0].save();
        const updateAmbassadorData = await Ambassador.findOneAndUpdate(
          {
            email: email,
          },
          {
            $set: { approval: "declined" },
          }
        );
        // application rejected email
        let firstName = findUser[0].firstName;
        let lastName = findUser[0].lastName;
        applicationRejected({
          email,
          firstName,
          lastName,
        });
        // forgot password email
        const sendemail = await sendMail(
          findUser[0]._id,
          email,
          "forgot password"
        );

        res.status(200).json({ data: findUser });
      }
    }
  } catch (err) {
    res.status(400).json({ err: err.message });
  }
};

exports.getAmbassadorData = async (req, res) => {
  const data = await Ambassador.aggregate([
    {
      $lookup: {
        from: "ambassadormetadatas",
        localField: "_id",
        foreignField: "ambassadorId",
        as: "ambData",
      },
    },
    {
      $project: {
        "ambData.orderList": 0,
      },
    },
  ]);
  res.status(200).json({ ambassadorsData: data });
};
