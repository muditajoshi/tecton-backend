const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    userType: [
      {
        type: String,
        // required: true,
      },
    ],
    firstName: {
      type: String,
      // required: true,
    },
    lastName: {
      type: String,
      // required: true,
    },
    gender: {
      type: String,
      // required: true,
    },
    termsAndConditions: {
      type: Boolean,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isConfirmed: {
      type: Boolean,
      required: true,
      default: false,
    },
    avatar: {
      type: String,
      required: true,
    },
    phoneNo: {
      type: String,
    },
    joinTheExtClub: {
      type: Boolean,
    },
    shippingAddress: {
      address_type: { type: String, default: "Shipping" },
      address1: { type: String },
      address2: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
    },
    billingAddress: {
      firstName: { type: String },
      lastName: { type: String },
      email: { type: String },
      phoneNo: { type: String },
      address_type: { type: String, default: "Billing" },
      address1: { type: String },
      address2: { type: String },
      city: { type: String },
      state: { type: String },
      zip: { type: String },
      country: { type: String },
    },
    einNumber: {
      type: String,
    },
    businessName: {
      type: String,
    },
    accountOwner: {
      type: String,
    },
    stripeCustomerId: { type: String },
    // one of the following 4 will be filled, or the password field is available
    socialMedia: [
      {
        _id: false,
        google: {
          id: { type: String },
          name: { type: String },
        },
        facebook: {
          id: { type: String },
          name: { type: String },
        },
        twitter: {
          id: { type: String },
          name: { type: String },
        },
        instagram: {
          id: { type: String },
          name: { type: String },
        },
        tiktok: {
          id: { type: String },
          name: { type: String },
        },
        otherSocialMediaLink: {
          id: { type: String },
          name: { type: String },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// function to check of passwords are matching
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// encrypt password before saving
userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(user.password, salt);
  user.password = hash;
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
