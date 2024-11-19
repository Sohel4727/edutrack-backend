// models/holiday.model.js
import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    date: { type: String, unique: true, required: true }, // Format: YYYY-MM-DD
    description: { type: String, required: true }, // Holiday description
  },
  { timestamps: true }
);

const Holiday = mongoose.model("Holiday", holidaySchema);
export { Holiday };
