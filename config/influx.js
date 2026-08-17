import { InfluxDB } from "@influxdata/influxdb-client";
import "dotenv/config";

export const influxTimeout = (() => {
  const configuredTimeout = Number(process.env.INFLUX_TIMEOUT);
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 15000;
})();

export const influxDB = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
  timeout: influxTimeout,
});

export const org = process.env.INFLUX_ORG;
export const bucket = process.env.INFLUX_BUCKET;

export const missingInfluxSettings = [
  ["INFLUX_URL", process.env.INFLUX_URL],
  ["INFLUX_TOKEN", process.env.INFLUX_TOKEN],
  ["INFLUX_ORG", org],
  ["INFLUX_BUCKET", bucket],
]
  .filter(([, value]) => !String(value || "").trim())
  .map(([key]) => key);

if (missingInfluxSettings.length > 0) {
  console.warn(
    "⚠️ Missing InfluxDB environment settings:",
    missingInfluxSettings.join(", ")
  );
}
