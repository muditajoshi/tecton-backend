// const { accessLogger, errorLogger } = require("../logs/Logger");

// const loggerStream = {
//   write: (message) => {
//     accessLogger.info(message);
//   },
// };

// const errorStream = {
//   write: (message) => {
//     errorLogger.error(message);
//   },
// };

// const options = {
//   noColors: true,
//   logReqDateTime: true,
//   logReqUserAgent: false,
//   logRequestBody: true,
//   logResponseBody: true,
//   maxBodyLength: 10000,
//   filterParameters: [
//     "password",
//     "email",
//     "phone",
//     "phoneNo",
//     "accessToken",
//     "refreshToken",
//   ],
//   prettify: true,
//   useUnifiedTopology: true,
// };

// const accessLog = {
//   ...options,
//   stream: loggerStream,
//   skip: (req, res) => res.statusCode >= 400,
// };

// const errorLog = {
//   ...options,
//   stream: errorStream,
//   skip: (req, res) => res.statusCode < 400,
// };

// module.exports = { accessLog, errorLog };
