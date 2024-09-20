const Contact = require("../models/contactModel");
exports.createContact = async (req, res) => {
  console.log(req.body);
  try {
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const email = req.body.email;
    const howCanWeHelpYou = req.body.howCanWeHelpYou;
    const message = req.body.message;

    if (isNaN(firstName, lastName, email, howCanWeHelpYou, message)) {
      const data = new Contact({
        firstName: firstName,
        lastName: lastName,
        email: email,
        howCanWeHelpYou: howCanWeHelpYou,
        message: message,
      });
      const newData = await data.save();
      console.log(newData);
      res.status(200).json({ status: "success", contactData: newData });
    } else {
      res.status(422).json({ err: "Invalid Data" });
    }
  } catch (err) {
    res.status(400).json({ err: "Bad request" });
  }
};

// This function retrieves contact data
// from the database and sends it in JSON format as a response.
exports.getContactData = async (req, res) => {
  const data = await Contact.find({});
  res.status(200).json({ ContactUsData: data });
};
