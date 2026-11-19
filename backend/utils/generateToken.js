import jwt from "jsonwebtoken";

/**
 * Generate a signed JWT token containing user id and role
 * @param {string} userId - MongoDB ObjectId string
 * @param {string} role - 'customer' or 'admin'
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, role = "customer") => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || "shoposphere_secret_jwt_key_fallback",
    {
      expiresIn: process.env.JWT_EXPIRE || "30d",
    }
  );
};

export default generateToken;
