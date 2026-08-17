import express from "express";
import bcrypt from "bcrypt";
import db from "../config/db.js";
import auth from "../middleware/auth.js";
const router = express.Router();

// =====================================
// USER MANAGEMENT
// =====================================

// CREATE USER
router.post(
  "/users",
  auth(["superadmin", "admin"]),
  async (req, res) => {
    const { username, password, role, org_id } =
      req.body;

    if (!username?.trim()) {
      return res.status(400).json({
        error: "Username is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters",
      });
    }

    const allowedRoles =
      req.user.role === "superadmin"
        ? ["admin", "editor", "viewer"]
        : ["editor", "viewer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error:
          req.user.role === "admin"
            ? "Admin can only create editor or viewer users"
            : "Invalid role",
      });
    }

    const finalOrgId =
      req.user.role === "admin"
        ? req.user.org_id
        : org_id || null;

    if (
      req.user.role === "admin" &&
      !finalOrgId
    ) {
      return res.status(403).json({
        error: "Admin has no organization assigned",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(
        password,
        10
      );

      db.query(
        `
        INSERT INTO users
        (username, password, role, org_id)
        VALUES (?, ?, ?, ?)
        `,
        [
          username.trim(),
          hashedPassword,
          role,
          finalOrgId,
        ],
        (err, result) => {
          if (err) {
            if (err.code === "ER_DUP_ENTRY") {
              return res.status(400).json({
                error: "Username already exists",
              });
            }

            console.error(
              "❌ Create user error:",
              err
            );

            return res.status(500).json({
              error: "Failed to create user",
            });
          }

          return res.json({
            success: true,
            message: "User created successfully",
            userId: result.insertId,
          });
        }
      );
    } catch (err) {
      return res.status(500).json({
        error: "Failed to hash password",
      });
    }
  }
);

// GET USERS
router.get(
  "/users",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const { role, org_id } = req.user;

    let sql = `
      SELECT
        u.id,
        u.username,
        u.role,
        u.org_id,
        o.name AS org_name,
        u.created_at,
        u.favorite_template_id,
        ft.name AS favorite_template_name
      FROM users u
      LEFT JOIN organizations o
        ON u.org_id = o.id
      LEFT JOIN templates ft
        ON u.favorite_template_id = ft.id
    `;

    const params = [];

    if (role === "admin") {
      sql += `
        WHERE u.org_id = ?
          AND u.role != 'superadmin'
      `;

      params.push(org_id);
    }

    sql += `
      ORDER BY u.id ASC
    `;

    db.query(sql, params, (err, results) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to fetch users",
        });
      }

      return res.json(results);
    });
  }
);

// UPDATE USER ROLE
router.put(
  "/users/:id/role",
  auth(["superadmin", "admin"]),
  (req, res) => {
    const userId = req.params.id;
    const { role, org_id } = req.body;

    const allowedRoles =
      req.user.role === "superadmin"
        ? ["admin", "editor", "viewer"]
        : ["editor", "viewer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error:
          req.user.role === "admin"
            ? "Admin can only assign editor or viewer role"
            : "Invalid role",
      });
    }

    const finalOrgId =
      req.user.role === "admin"
        ? req.user.org_id
        : org_id || null;

    if (
      req.user.role === "admin" &&
      !finalOrgId
    ) {
      return res.status(403).json({
        error: "Admin has no organization assigned",
      });
    }

    const updateUser = () => {
      db.query(
        `
        UPDATE users
        SET role = ?, org_id = ?
        WHERE id = ?
          AND role != 'superadmin'
        `,
        [role, finalOrgId, userId],
        (err, result) => {
          if (err) {
            return res.status(500).json({
              error: "Failed to update user role",
            });
          }

          if (!result.affectedRows) {
            return res.status(404).json({
              error:
                "User not found or cannot update superadmin",
            });
          }

          return res.json({
            success: true,
            message: "User role updated",
          });
        }
      );
    };

    if (req.user.role === "superadmin") {
      updateUser();
      return;
    }

    db.query(
      `
      SELECT id, role, org_id
      FROM users
      WHERE id = ?
      `,
      [userId],
      (err, users) => {
        if (err) {
          return res.status(500).json({
            error: "Failed to check user",
          });
        }

        if (!users.length) {
          return res.status(404).json({
            error: "User not found",
          });
        }

        const targetUser = users[0];

        if (
          targetUser.role === "superadmin" ||
          Number(targetUser.org_id) !==
            Number(req.user.org_id)
        ) {
          return res.status(403).json({
            error:
              "You can only manage users in your organization",
          });
        }

        updateUser();
      }
    );
  }
);

export default router;
