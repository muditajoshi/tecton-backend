const Address = require("../models/addressModel");
const { json } = require("body-parser");

exports.getAddressByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    var getData = await Address.find({ userId: userId });
    res.status(200).json(getData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getAddressByAddressId = async (req, res) => {
  try {
    const id = req.params.id;
    const idShipping = await Address.find({
      "shippingAddress._id": id,
    });
    const idBilling = await Address.find({
      "billingAddress._id": id,
    });
    let getIndex;
    let incNo = 0;
    if (idShipping.length > 0) {
      idShipping[0].shippingAddress.map((value) => {
        if (String(value._id) === id) {
          getIndex = incNo;
        }

        incNo += 1;
      });
      const getData = idShipping[0].shippingAddress[getIndex];
      res.status(200).json(getData);
    } else if (idBilling.length > 0) {
      idBilling[0].billingAddress.map((value) => {
        if (String(value._id) === id) {
          getIndex = incNo;
        }
        incNo += 1;
      });
      const getData = idBilling[0].billingAddress[getIndex];
      res.status(200).json(getData);
    } else {
      res.json({ message: "Id doesn't exist" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.addAddress = async (req, res) => {
  try {
    const { shippingAddress, billingAddress } = req.body;
    const userId = req.user._id;

    var getData = await Address.find({ userId: userId });
    console.log(getData.length);
    if (getData.length > 0) {
      if (!billingAddress) {
        var address = await Address.updateOne(
          { userId: userId },

          {
            $push: {
              shippingAddress: req.body.shippingAddress,
            },
          }
        );
        var getData = await Address.find({ userId: userId });
        res.status(200).json(getData);
      } else if (!shippingAddress) {
        console.log(billingAddress);
        var address = await Address.updateOne(
          { userId: userId },

          {
            $push: {
              billingAddress: req.body.billingAddress,
            },
          }
        );
        var getData = await Address.find({ userId: userId });
        res.status(200).json(getData);
      }
    } else {
      const address = new Address({
        shippingAddress: shippingAddress,

        billingAddress: billingAddress,

        userId: userId,
      });

      const savedAddress = await address.save();

      res.status(200).json(savedAddress);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const shippingAddress = req.body.shippingAddress;
    const billingAddress = req.body.billingAddress;

    let getIndex;
    let incNo = 0;
    if (shippingAddress) {
      const idShipping = await Address.find({
        "shippingAddress._id": id,
      });
      console.log("117");
      if (idShipping.length > 0) {
        idShipping[0].shippingAddress.map((value) => {
          if (String(value._id) === id) {
            getIndex = incNo;
          }

          incNo += 1;
        });
        idShipping[0].shippingAddress[getIndex] = shippingAddress;
        const saveData = await idShipping[0].save();

        res.status(200).json(saveData.shippingAddress[getIndex]);
      } else {
        res.json({ message: "Id doesn't exist" });
      }
    } else if (billingAddress) {
      const idBilling = await Address.find({
        "billingAddress._id": id,
      });
      console.log("130");
      if (idBilling.length > 0) {
        idBilling[0].billingAddress.map((value) => {
          if (String(value._id) === id) {
            getIndex = incNo;
          }
          incNo += 1;
        });
        idBilling[0].billingAddress[getIndex] = billingAddress;
        const saveData = await idBilling[0].save();
        res.status(200).json(saveData.billingAddress[getIndex]);
      } else {
        res.json({ message: "Id doesn't exist" });
      }
    } else {
      res.json({ message: "Id doesn't exist" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.deleteAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const findShippingAddress = await Address.find({
      "shippingAddress._id": id,
    });
    const findBillingAddress = await Address.find({
      "billingAddress._id": id,
    });

    if (findShippingAddress.length > 0) {
      var getData = await Address.updateOne(
        { "shippingAddress._id": id },
        { $pull: { shippingAddress: { _id: id } } }
      );
      res.status(204).json({ message: "deleted" });
    } else if (findBillingAddress.length > 0) {
      var getData = await Address.updateOne(
        { "billingAddress._id": id },
        { $pull: { billingAddress: { _id: id } } }
      );
      res.status(204).json({ message: "deleted" });
    } else {
      res.status(200).json({ message: "Id doesn't exist" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
