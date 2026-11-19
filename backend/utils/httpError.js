// A small error type that carries an HTTP status code and a message.
// Anywhere in the order code we can write:  throw new HttpError(409, "Out of stock")
// and sendError() turns it into a proper JSON answer for the page.

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra; // optional extra fields sent to the page (e.g. a list of issues)
  }
}

export const sendError = (res, err, fallbackMessage = "Something went wrong") => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...err.extra });
  }
  if (err && err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first.message });
  }
  // Unexpected problem: log it in the backend terminal so it can be debugged.
  console.error(fallbackMessage, err);
  return res.status(500).json({ message: fallbackMessage });
};
