import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import cron from "node-cron";  // Import node-cron
import {Barcode} from "./models/barcode.model.js"; // Import the Barcode model
const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static("public"));
app.use(cookieParser());

// routes

import authRouter from "./routes/auth.routes.js";
import attendanceRouter from "./routes/attendance.routes.js";
import barcodeRoutes from "./routes/barcode.routes.js";
import leaveRoutes from "./routes/leave.routes.js";

// routes declarations
app.use("/api/v1/auth", authRouter);
// http://localhost:8000/api/v1/users/register

app.use("/api/v1/attendance", attendanceRouter); // Use the attendance routes
app.use("/api/v1/barcode", barcodeRoutes);
app.use("/api/v1/leave", leaveRoutes);


// Cron job to delete all barcode entries at midnight every day
cron.schedule("0 0 * * *", async () => {
  try {
    await Barcode.deleteMany({}); // Clear all barcode records
    console.log("Deleted all barcode records at midnight");
  } catch (err) {
    console.error("Failed to delete barcode records:", err.message);
  }
});
export { app };
