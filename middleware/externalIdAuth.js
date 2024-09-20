exports.authentication = async (req, res, next) => {
  var authheader = req.headers.authorization;
  console.log(req.headers);

  if (!authheader) {
    var err = new Error("You are not authenticated!");
    res.setHeader("WWW-Authenticate", "Basic");
    err.status = 401;
    return next(err.message);
  }

  var auth = new Buffer.from(authheader.split(" ")[1], "base64")
    .toString()
    .split(":");
  var user = auth[0];
  var pass = auth[1];

  if (user == "tlextidusr" && pass == "bQvNF6W05uHj06OI") {
    // If Authorized user
    next();
  } else {
    var err = new Error("You are not authenticated!");
    res.setHeader("WWW-Authenticate", "Basic");
    err.status = 401;
    return next(err.message);
  }
};
