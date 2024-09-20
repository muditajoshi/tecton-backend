//  Tectonlife.com Developed by: S3B Global

// `Email: info@s3bglobal.com, sunil@s3bglobal.com`

// Development Team: Rajat Sharma, Mudita Joshi

// Created at Date time : 16 may 2023, 06:22 PM IST

const GlobalValues = require("../models/globalValuesModel");

//  create/update govx code in the global values model
const updateGovxCode = async (req, res) => {
  try {
    const { govxCode } = req.body;
    const checkGovxCode = await GlobalValues.findOne({
      "utility.utilityType": "GovxCode",
    });
    if (!checkGovxCode) {
      const createGovxCode = new GlobalValues({
        "utility.utilityType": "GovxCode",
        "utility.govxCode": govxCode,
      });
      const saveData = await createGovxCode.save();
      res.status(200).json({ message: "Govx code created successfully" });
    } else {
      const updateGovx = await GlobalValues.updateOne(
        { "utility.utilityType": "GovxCode" },
        { $set: { "utility.govxCode": govxCode } }
      );
      res.status(200).json({ message: "Govx code updated successfully" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// get govx code from global values model
const getGovxCode = async (req, res) => {
  try {
    const findGovxCode = await GlobalValues.findOne({
      "utility.utilityType": "GovxCode",
    });
    if (!findGovxCode) {
      res.status(400).json({
        message: "Govx code doesn't exist. Please create govx code first",
      });
    } else {
      res
        .status(200)
        .json({ data: findGovxCode.utility.govxCode, message: "successfull" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getGovxCode, updateGovxCode };
