import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/authRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import influxRoutes from "./routes/influxRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

const PORT =
  Number(process.env.PORT) ||
  5000;

// All route modules already define their complete API paths,
// so mount them at the application root.
app.use("/", authRoutes);
app.use("/", deviceRoutes);
app.use("/", influxRoutes);
app.use("/", organizationRoutes);
app.use("/", templateRoutes);
app.use("/", userRoutes);

app.get("/health", (req, res) => {
  return res.json({
    ok: true,
    service:
      "industrial-dashboard-api",
  });
});

// Final JSON error fallback.
app.use((err, req, res, next) => {
  console.error(
    "❌ Unhandled server error:",
    err
  );

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error:
      "Unexpected server error",
  });
});

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on http://localhost:${PORT}`
  );
});
