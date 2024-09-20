const asyncHandler= require('express-async-handler') ;

// @desc fetch PAYPAL client id credential from .env file
// @route GET /api/config/paypal
// @access PRIVATE
const getPaypalClientId = asyncHandler(async (req, res) => {
	res.send(process.env.PAYPAL_CLIENT_ID);
});

module.exports= { getPaypalClientId };
