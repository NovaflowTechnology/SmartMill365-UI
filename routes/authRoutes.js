import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import "dotenv/config";
import db from "../config/db.js";

const SECRET = process.env.JWT_SECRET;
const router = express.Router();

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

      if (!results.length) {
        return res.status(401).json({
          error: "User not found",
        });
      }

      const user = results[0];

      const match = await bcrypt.compare(
        password,
        user.password
      );

      if (!match) {
        return res.status(401).json({
          error: "Wrong password",
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
