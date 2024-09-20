const UserMetaData = require("../models/userMetaModel");
const AmbassadorMetaData = require("../models/ambassadorMetaModel");
const OrderMetaData = require("../models/orderMetaModel");
const User = require("../models/userModel");

const userMetaAndAmbComUpdate = async ({ saveData }) => {
  const order = [saveData];

  try {
    // get user data
    const getuserData = await User.findOne({ _id: order[0].user });
    const getUserMetaData = await UserMetaData.find({
      userId: order[0].user,
    });
    if (
      order[0].user !== "Guest" &&
      getuserData.userType[0] !== "Ambassador" &&
      getuserData.userType[0] !== "Veteran" &&
      getuserData.userType[0] !== "Employee" &&
      getuserData.userType[0] !== "Test" &&
      getUserMetaData.length > 0
    ) {
      const findUserMetaData = await UserMetaData.find({
        userId: order[0].user,
      });

      const findAmbassadorMeta = await AmbassadorMetaData.find({
        refCode: findUserMetaData[0].ambassador.refCode,
      });

      if (
        findUserMetaData[0].firstPurchase == true &&
        findUserMetaData.length > 0
      ) {
        const firstOrderDate = new Date();
        const timeStamp = firstOrderDate.getTime();

        await UserMetaData.updateOne(
          { userId: order[0].user },
          {
            $set: {
              firstPurchase: false,
              "ambassador.referalOrderId": String(order[0]._id),
              "ambassador.dateOfFirstOrder": String(timeStamp),
            },
            $push: { "ambassador.orderIds": String(order[0]._id) },
          }
        );

        // updating ambassador meta start

        const orderMetaFind = await OrderMetaData.find({
          orderId: order[0]._id,
        });

        const updateCommission =
          orderMetaFind[0].ambassadorCommission +
          findAmbassadorMeta[0].commissionedAmount;
        const updateAmbassadorMeta = await AmbassadorMetaData.updateOne(
          {
            refCode: findUserMetaData[0].ambassador.refCode,
          },
          {
            $set: { commissionedAmount: updateCommission },
            $push: {
              orderList: {
                orderId: String(order[0]._id),
                orderCommission: orderMetaFind[0].ambassadorCommission,
              },
            },
          }
        );
        // updating ambassador meta start
      } else if (
        findUserMetaData[0].firstPurchase == false &&
        findUserMetaData.length > 0
      ) {
        // const addUnixData = 3153600; //365*24*60*60
        const addUnixData =
          94672800000 + Number(findUserMetaData[0].ambassador.dateOfFirstOrder);

        const oneYearUnixData =
          31557600000 + Number(findUserMetaData[0].ambassador.dateOfFirstOrder);
        const matchUnix = new Date();
        const compareUnix = matchUnix.getTime();

        if (
          findAmbassadorMeta[0].ambassadorNo <= 100 &&
          addUnixData >= compareUnix
        ) {
          // updating usermeta data start
          await UserMetaData.updateOne(
            { userId: order[0].user },
            {
              $push: {
                "ambassador.orderIds": String(order[0]._id),
              },
            }
          );
          // updating usermeta data end

          // updating ambassador meta start

          const orderMetaFind = await OrderMetaData.find({
            orderId: order[0]._id,
          });

          const updateCommission =
            orderMetaFind[0].ambassadorCommission +
            findAmbassadorMeta[0].commissionedAmount;
          const updateAmbassadorMeta = await AmbassadorMetaData.updateOne(
            {
              refCode: findUserMetaData[0].ambassador.refCode,
            },
            {
              $set: { commissionedAmount: updateCommission },
              $push: {
                orderList: {
                  orderId: String(order[0]._id),
                  orderCommission: orderMetaFind[0].ambassadorCommission,
                },
              },
            }
          );
          // updating ambassador meta start
        } else if (
          findAmbassadorMeta[0].ambassadorNo > 100 &&
          oneYearUnixData >= compareUnix
        ) {
          // updating usermeta data start
          await UserMetaData.updateOne(
            { userId: order[0].user },
            {
              $push: {
                "ambassador.orderIds": String(order[0]._id),
              },
            }
          );
          // updating usermeta data end

          // updating ambassador meta start

          const orderMetaFind = await OrderMetaData.find({
            orderId: order[0]._id,
          });

          const updateCommission =
            orderMetaFind[0].ambassadorCommission +
            findAmbassadorMeta[0].commissionedAmount;
          const updateAmbassadorMeta = await AmbassadorMetaData.updateOne(
            {
              refCode: findUserMetaData[0].ambassador.refCode,
            },
            {
              $set: { commissionedAmount: updateCommission },
              $push: {
                orderList: {
                  orderId: String(order[0]._id),
                  orderCommission: orderMetaFind[0].ambassadorCommission,
                },
              },
            }
          );
          // updating ambassador meta start
        }
      }
    }
  } catch (err) {
    console.log(err.message);
  }
};

module.exports = userMetaAndAmbComUpdate;
