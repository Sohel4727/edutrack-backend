// models/attendance.model.js
import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    status: { type: String, enum: ["present", "absent"], default: "present" },
    time: { type: Date, default: Date.now }, // Add time field with default value
  },
  { timestamps: true }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);
export { Attendance };
