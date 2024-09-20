// handle 404 errors

const notFound = (req, res, next) => {
  const error = new Error(`Route not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// custom error handler to return json instead of HTML when any error is thrown
const errorHandler = (err, req, res, next) => {
  // check the status code of the response
  if (
    err.statusCode === 429 &&
    err.message === process.env.LOGIN_LIMITER_MESSAGE
  ) {
    res.status(429).json({
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  } else if (
    err.statusCode === 429 &&
    err.message === process.env.SIGNUP_LIMITER_MESSAGE
  ) {
    res.status(429).json({
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  } else {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? null : err.stack,
    });
  }
};

module.exports = { notFound, errorHandler };
