const express = require("express");
var request = require("request");
const OrderMeta = require("../models/orderMetaModel");
// ship station code
const shipStation = async (req, res) => {
  try {
    const payload = req.body;
    let data;
    // console.log("7", req.body);

    if (payload.resource_type === "ORDER_NOTIFY") {
      const resourceUrl = payload.resource_url;

      // Process the order creation webhook
      // console.log("New order webhook received:", resourceUrl);

      var options = {
        method: "GET",
        url: resourceUrl,
        headers: {
          Host: "ssapi.shipstation.com",
          Authorization: process.env.SHIPSTATION_AUTH,
        },
      };
      request(options, async function (error, response) {
        if (error) throw new Error(error);
        const data = JSON.parse(response.body);
        // const data = JSON.stringify(parseData);
        console.log("29----------", data);
        const getOrderMeta = await OrderMeta.findOne({
          orderId: data.orders[0].orderNumber,
        });

        if (!getOrderMeta) {
          const createOrderMeta = new OrderMeta({
            orderId: data.orders[0].orderNumber,
            shipStationOrderId: data.orders[0].orderId,
            orderStatus: data.orders[0].orderStatus,
          });
          const saveData = await createOrderMeta.save();
        } else {
          const updateOrderMeta = await OrderMeta.updateOne(
            {
              orderId: data.orders[0].orderNumber,
            },
            {
              $set: {
                shipStationOrderId: data.orders[0].orderId,
                orderStatus: data.orders[0].orderStatus,
              },
            }
          );
        }
      });
      // Add your custom logic here to handle the new order
      // For example, you can make an API call to the resource_url to get order details
    } else if (payload.resource_type === "SHIP_NOTIFY") {
      const resourceUrl = payload.resource_url;

      // Process the order creation webhook
      // console.log("New order webhook received:", resourceUrl);

      var options = {
        method: "GET",
        url: resourceUrl,
        headers: {
          Host: "ssapi.shipstation.com",
          Authorization: process.env.SHIPSTATION_AUTH,
        },
      };
      request(options, async function (error, response) {
        if (error) throw new Error(error);
        const data = JSON.parse(response.body);
        console.log("74-------------", data);

        const updateOrderMeta = await OrderMeta.updateOne(
          {
            orderId: data.orders[0].orderNumber,
          },
          {
            $set: {
              orderStatus: data.orders[0].orderStatus,
            },
          }
        );
      });

      // Add your custom logic here to handle the new order
      // For example, you can make an API call to the resource_url to get order details
    } else {
      console.log("Unhandled webhook type:", payload.resource_type);
      var options = {
        method: "GET",
        url: resourceUrl,
        headers: {
          Host: "ssapi.shipstation.com",
          Authorization: process.env.SHIPSTATION_AUTH,
        },
      };
      request(options, async function (error, response) {
        if (error) throw new Error(error);
        const data = JSON.parse(response.body);
        console.log("103------------", data);
      });
    }

    // Send a 200 status code to acknowledge receipt of the webhook
    res.sendStatus(200);
  } catch (error) {
    console.log(error.message);
  }
};
module.exports = shipStation;
