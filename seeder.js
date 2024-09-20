const mongoose =require('mongoose') ;
const colors =require('colors') ;
const dotenv =require('dotenv') ;
const users =require('./data/users.js') ;
const products =require('./data/products.js') ;
const User =require( './models/userModel.js');
const Product =require('./models/productModel.js') ;
const Order =require('./models/orderModel.js') ;
const Token =require('./models/tokenModel.js') ;
const connectDB =require( './config/db.js');

dotenv.config();
connectDB();

const importData = async () => {
	try {
		// delete all the current data in all three collections
		await User.deleteMany();
		await Product.deleteMany();
		await Order.deleteMany();
		await Token.deleteMany();

		// create an array os users to seed into the DB
		const newUsers = await User.insertMany(users);

		// get the admin user document's id
		const adminUser = newUsers[0]._id;

		// add this admin user as the user that added all these products into the DB
		const sampleProducts = products.map((product) => ({
			...product,
			user: adminUser,
		}));

		await Product.insertMany(sampleProducts);

		console.log('Data inserted in to the DB'.green.inverse);
		process.exit();
	} catch (err) {
		console.error(`Error: ${err.message}`.red.inverse);
	}
};

const destroyData = async () => {
	try {
		// delete all the current data in all three collections
		await User.deleteMany();
		await Product.deleteMany();
		await Order.deleteMany();
		await Token.deleteMany();

		console.log('Data deleted from the DB'.red.inverse);
		process.exit();
	} catch (err) {
		console.error(`Error: ${err.message}`.red.inverse);
	}
};

// check the npm flag and call appropriate function
if (process.argv[2] === '-d') destroyData();
else importData();
