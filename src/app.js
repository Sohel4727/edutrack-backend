import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import attendanceRouter from "./routes/attendance.routes.js"
import barcodeRoutes from "./routes/barcode.routes.js"

// routes declarations
app.use("/api/v1/auth", authRouter);
// http://localhost:8000/api/v1/users/register

app.use("/api/v1/attendance", attendanceRouter); // Use the attendance routes
app.use("/api/v1/barcode", barcodeRoutes);

export { app };
