const express =require('express') ;
const { getPaypalClientId } =require('../controllers/configControllers.js') ;
const { protectRoute } =require('../middleware/authMiddleware.js') ;

const router = express.Router();

// @desc fetch PAYPAL client id credential
// @route GET /api/config/paypal
// @access PRIVATE
router.route('/paypal').get(protectRoute, getPaypalClientId);

module.exports= router;
