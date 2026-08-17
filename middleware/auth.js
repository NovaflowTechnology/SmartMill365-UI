import jwt from "jsonwebtoken";
import "dotenv/config";

const SECRET = process.env.JWT_SECRET;

const auth = (roles = []) => {
  return (req, res, next) => {
    const rawAuthorization = req.headers.authorization;
    const token = rawAuthorization?.startsWith("Bearer ")
      ? rawAuthorization.replace("Bearer ", "")
      : rawAuthorization;

    if (!token) {
      return res.status(403).json({
        error: "No authentication token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, SECRET);
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({
          error: "You do not have permission for this action",
        });
      }
      req.user = decoded;
      next();
    } catch (err) {
      console.error("❌ Authentication error:", err);
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }
  };
};

export default auth;
