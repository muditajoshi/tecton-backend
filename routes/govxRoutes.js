//  Tectonlife.com Developed by: S3B Global

// `Email: info@s3bglobal.com, sunil@s3bglobal.com`

// Development Team: Rajat Sharma, Mudita Joshi

//Created at Date time : 16 may 2023, 06:22 PM IST

const express = require("express");
const {
  updateGovxCode,
  getGovxCode,
} = require("../controllers/govxController");
const router = express.Router();
const { isAdmin, protectRoute } = require("../middleware/authMiddleware");

// @desc  Get govx code
// @route GET /api/govxcode/get-govx-code
// @access PRIVATE
router.route("/get-govx-code").get(protectRoute, isAdmin, getGovxCode);

// @desc update govx code
// @route PUT /api/govxcode/update-govx-code
// @access PRIVATE
router.route("/update-govx-code").put(protectRoute, isAdmin, updateGovxCode);

module.exports = router;
