import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import process from "node:process";
import "dotenv/config";
import db from "../config/db.js";

const SECRET = process.env.JWT_SECRET;
const router = express.Router();
const INVALID_CREDENTIALS_MESSAGE =
  "Invalid username or password";

// Comparing against a real BCrypt hash for unknown usernames keeps the
// failure path closer to the timing of a wrong-password attempt.
const DUMMY_PASSWORD_HASH =
  "$2b$10$WdH2M2G4r6rZ.IQzx14ga.NZ//hGNokLu2yC3g2xQPYEOmS9HDxEq";

// =====================================
// LOGIN
// =====================================
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    `
    SELECT
      users.*,
      organizations.name AS org_name
    FROM users
    LEFT JOIN organizations
      ON users.org_id = organizations.id
    WHERE users.username = ?
    `,
    [username],
    async (err, results) => {
      if (err) {
        console.error("❌ Login query error:", err);

        return res.status(500).json({
          error: "Database error",
        });
      }

      const user = results[0] || null;

      const match = await bcrypt.compare(
        String(password || ""),
        user?.password || DUMMY_PASSWORD_HASH
      );

      if (!user || !match) {
        return res.status(401).json({
          error: INVALID_CREDENTIALS_MESSAGE,
        });
      }

      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
          org_id: user.org_id || null,
          org_name: user.org_name || null,
          favorite_template_id:
            user.favorite_template_id || null,
        },
        SECRET,
        {
          expiresIn: "1d",
        }
      );

      return res.json({
        token,
        role: user.role,
        org_id: user.org_id || null,
        org_name: user.org_name || null,
        favorite_template_id:
          user.favorite_template_id || null,
      });
    }
  );
});

export default router;
