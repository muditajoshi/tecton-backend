// const winston = require("winston");
// require("winston-mongodb");

// const accessLogger = winston.createLogger({
//   transports: [
//     new winston.transports.MongoDB({
//       db: "mongodb://localhost:27017/tectonlogs",
//       options: {
//         useUnifiedTopology: true,
//       },
//       collection: "accessLogs",
//     }),
//   ],
// });

// const errorLogger = winston.createLogger({
//   transports: [
//     new winston.transports.MongoDB({
//       db: "mongodb://localhost:27017/tectonlogs",
//       options: {
//         useUnifiedTopology: true,
//       },
//       collection: "errorLogs",
//     }),
//   ],
// });

// const emailLogger = winston.createLogger({
//   transports: [
//     new winston.transports.MongoDB({
//       db: "mongodb://localhost:27017/tectonlogs",
//       options: {
//         useUnifiedTopology: true,
//       },
//       collection: "emailLogs",
//     }),
//   ],
// });

// module.exports = { accessLogger, errorLogger, emailLogger };
