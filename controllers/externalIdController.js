const externalIdModel = require("../models/externalId");

exports.getExternalID = async (req, res) => {
  try {
    const getData = await externalIdModel.find({});
    res.status(200).json({ externalIds: getData });
  } catch (err) {
    res.status(400).json({ error: err });
  }
};

exports.postExternalId = async (req, res) => {
  try {
    const { externalId, id, idType, status } = req.body;
    const newData = new externalIdModel({
      externalId: externalId,
      id: id,
      idType: idType,
      status: status,
    });

    const saveData = await newData.save();
    res.status(200).json({ data: saveData, message: "successful" });
  } catch (err) {
    res.status(400).json({ err: "Bad request" });
  }
};

exports.updateExternalId = async (req, res) => {
  try {
    const { externalId, status } = req.body;
    const getdata = { id: externalId.id, name: externalId.name };
    const findId = await externalIdModel.find({
      externalId: { $elemMatch: { id: req.query.id } },
    });

    if (findId) {
      findId[0].externalId = [...findId[0].externalId, getdata];
      findId.status = status;
      const data = await findId[0].save();
      res.status(200).json({ data: data });
    }
  } catch (err) {
    res.status(400).json({ message: "Bad request" });
  }
};

exports.getByIdExternalID = async (req, res) => {
  try {
    const idType = req.query.idType.toUpperCase();
    if (!idType) {
      const getData = await externalIdModel.findById(req.params.id);
      res.status(200).json({ externalIds: getData });
    } else if (idType) {
      if (idType === "CUSTOMER") {
        const customerData = await externalIdModel.find({
          externalId: { $elemMatch: { id: req.params.id } },
          idType: idType,
        });
        if (customerData.length > 0) {
          res.status(200).json({ externalIds: customerData });
        } else {
          res.status(400).json({ message: "invalid id or idType" });
        }
      } else if (idType === "ORDER") {
        const orderData = await externalIdModel.find({
          externalId: { $elemMatch: { id: req.params.id } },
          idType: idType,
        });
        if (orderData.length > 0) {
          res.status(200).json({ externalIds: orderData });
        } else {
          res.status(400).json({ message: "invalid id or idType" });
        }
      } else if (idType === "PRODUCT") {
        const productData = await externalIdModel.find({
          externalId: { $elemMatch: { id: req.params.id } },
          idType: idType,
        });
        if (productData.length > 0) {
          res.status(200).json({ externalIds: productData });
        } else {
          res.status(400).json({ message: "invalid id or idType" });
        }
      } else {
        res.status(400).json({ message: "invalid id or idType" });
      }
    } else {
      res.status(400).json({ message: "invalid id or idType" });
    }
  } catch (err) {
    res.status(400).json({ error: err });
  }
};
