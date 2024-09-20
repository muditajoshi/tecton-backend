const careers = require("../models/careers");
exports.careersController = async (req, res) => {
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const where_did_you_hear_about_tecton =
      req.body.where_did_you_hear_about_tecton;
    const what_do_you_do = req.body.what_do_you_do;
    const street_address = req.body.street_address;
    const city = req.body.city;
    const state = req.body.state;
    const postal_code = req.body.postal_code;

    const country = req.body.country;

    const careersData = new careers({
      firstName: firstName,
      lastName: lastName,
      email: email,
      where_did_you_hear_about_tecton: where_did_you_hear_about_tecton,
      what_do_you_do: what_do_you_do,
      street_address: street_address,
      city: city,
      state: state,
      postal_code: postal_code,
      country: country,
    });
    const newData = await careersData.save();
    res.status(200).json({ status: "success", data: newData });
  } catch (err) {
    res.status(400).json({ err: "Bad request" });
  }
};
