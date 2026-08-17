import "dotenv/config";
import express from "express";
import cors from "cors";

import "./config/db.js";
import {
  bucket,
  influxTimeout,
  missingInfluxSettings,
  org,
} from "./config/influx.js";

import authRoutes from "./routes/authRoutes.js";
import templateRoutes from "./routes/templateRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";
import influxRoutes from "./routes/influxRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(authRoutes);
app.use(templateRoutes);
app.use(userRoutes);
app.use(organizationRoutes);
app.use(deviceRoutes);
app.use(influxRoutes);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);

  if (missingInfluxSettings.length === 0) {
    console.log(
      `✅ InfluxDB configured: ${process.env.INFLUX_URL} | org=${org} | bucket=${bucket} | timeout=${influxTimeout}ms`
    );
  }
});
