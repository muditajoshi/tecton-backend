// limiter
// const rateLimit = require("express-rate-limit");
// const limiter = rateLimit({
//   windowMs: 5 * 60 * 1000, // 15 minutes
//   max: 6, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
//   standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//   legacyHeaders: false, // Disable the `X-RateLimit-*` headers
//   message:
//     "You have attempted to log in three times with an incorrect user name and password combination. Please try again after 5 minutes.",
// });
// const LimitingMiddleware = require("limiting-middleware");
// const limiter = async (req, res, next) => {
//   const checklimiter = new LimitingMiddleware({
//     limit: 6,
//     resetInterval: 180000,
//   }).limitByIp(); // 100 request limit. 1200000ms reset interval (20m)
//   console.log(checklimiter);
//   next();
// };

const DEFAULT_LIMIT = 6;
const MINUTES = 1000 * 3;
const HOURS = MINUTES * 60;
const DEFAULT_INTERVAL = MINUTES * 15;

class newlimiter {
  constructor({ limit, resetInterval } = {}) {
    this.ipHitsMap = {};
    this.limit = limit || DEFAULT_LIMIT;
    this.resetInterval = resetInterval || DEFAULT_INTERVAL;
    this.startResetInterval();
  }

  limitByIp() {
    return (req, res, next) => {
      const requesterIp = String(
        req.headers["x-forwarded-for"] ||
          req.connection.remoteAddress ||
          "unknown"
      );

      // console.log("requesterIp", requesterIp);

      if (!this.ipHitsMap[requesterIp]) {
        this.ipHitsMap[requesterIp] = 1;
      } else {
        this.ipHitsMap[requesterIp] = this.ipHitsMap[requesterIp] + 1;
      }

      if (this.ipHitsMap[requesterIp] > this.limit) {
        const rate = this.resetInterval / MINUTES;
        const error = new Error(process.env.SIGNUP_LIMITER_MESSAGE);

        error.statusCode = 429;

        throw error;
      }

      next();
    };
  }

  resetIpHitsMap() {
    console.log("Reset ipHitMap");
    this.ipHitsMap = {};
  }

  startResetInterval(interval = this.resetInterval) {
    setInterval(() => this.resetIpHitsMap(), interval);
  }
}
const regLimiter = new newlimiter({
  limit: 3,
  resetInterval: process.env.SIGNUP_LIMITER,
}).limitByIp();
module.exports = regLimiter;
