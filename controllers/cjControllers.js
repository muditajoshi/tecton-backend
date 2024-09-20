const Contact = require("../models/contactModel");
const axios = require('axios');

exports.createCJ = async (req, res) => {
  try {
    const cjevent = req.body.cjevent;
    const pageview = req.body.pageview;
    const qty = req.body.qty;
    const amount = req.body.amount;
    const oid = req.body.oid;
    const eventTime = req.body.eventTime;
    const currency = req.body.currency;
    const items = req.body.items;
    const discount=req.body.discount;

    
    req.session.cjevent = cjevent;

    if (pageview === 1) {

    
     
      const trackingUrl = `http://www.emjcd.com/u?CID=1565379&TYPE=437015&METHOD=S2S&SIGNATURE=11edbf240c921a81abbbf84c34c2a68f&CJEVENT=${cjevent}&eventTime=${eventTime}&OID=${oid}&currency=${currency}&${items}&discount=${discount}`;
      console.log(trackingUrl,'trackingUrl')
      axios.get(trackingUrl)
        .then(response => {
          const headerDate = response.headers && response.headers.date ? response.headers.date : 'no response date';
          console.log('Status Code:', response.status);
          console.log('Date in Response header:', headerDate);
          const responseData = response.data.toString().replace('\n', ''); 

          console.log('Response ended: ', responseData);
          res.send({ data: responseData });
        })
        .catch(error => {
          console.log('Error: ', error.message);
          res.status(500).send({ error: error.message });
        });
       
    } else {
      const trackingUrl = `http://www.emjcd.com/u?CID=1565379&TYPE=437015&METHOD=S2S&SIGNATURE=11edbf240c921a81abbbf84c34c2a68f&CJEVENT=${cjevent}`;
      axios.get(trackingUrl)
        .then(response => {
          const headerDate = response.headers && response.headers.date ? response.headers.date : 'no response date';
          console.log('Status Code:', response.status);
          console.log('Date in Response header:', headerDate);
          const responseData = response.data.toString().replace('\n', ''); 
          console.log('Response ended: ', responseData);
         
          res.send({ data: responseData });
        })
        .catch(error => {
          console.log('Error: ', error.message);
          res.status(500).send({ error: error.message });
        });
    }
  } catch (err) {
    res.status(400).json({ err: "Bad request" });
  }
};
