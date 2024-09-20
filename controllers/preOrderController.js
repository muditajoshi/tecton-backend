const pre_order = require("../models/preOrder");
exports.createPreOrder = async (req, res) => {
  console.log(req.body);
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const where_did_you_hear_about_tecton =
      req.body.where_did_you_hear_about_tecton;
    const city = req.body.city;
    const state = req.body.state;
    const postal_code = req.body.postal_code;

    const country = req.body.country;
    console.log(
      firstName,
      lastName,
      email,
      where_did_you_hear_about_tecton,
      city,
      state,
      country,
      postal_code
    );
    if (
      isNaN(
        firstName,
        lastName,
        email,
        where_did_you_hear_about_tecton,
        city,
        state,
        country
      )
    ) {
      const data = new pre_order({
        firstName: firstName,
        lastName: lastName,
        email: email,
        where_did_you_hear_about_tecton: where_did_you_hear_about_tecton,
        city: city,
        state: state,
        postal_code: postal_code,
        country: country,
      });

      const userData = await data.save();
      console.log("The result is ", userData);
      res.status(200).json({ status: "success", info: userData });
    } else {
      res.status(422).json({ err: "Invalid Data" });
    }
  } catch (err) {
    res.status(400).json({ err: "Bad Request" });
  }
};
