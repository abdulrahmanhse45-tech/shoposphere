/**
 * 404 Not Found Middleware
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized Error Handling Middleware
 * Ensures consistent JSON response format across the entire API:
 * { success: false, message, errors }
 */
export const errorHandler = (err, req, res, next) => {
  // If status code is 200, default to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || "Internal Server Error";

  // Handle Mongoose Duplicate Key error (E11000)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `An account with that ${field} already exists.`;
  }

  // Handle Mongoose Validation Errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  // Handle Invalid Mongoose ObjectId CastError
  if (err.name === "CastError") {
    statusCode = 404;
    message = `Resource not found with invalid ID format.`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
