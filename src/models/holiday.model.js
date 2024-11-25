import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      unique: true, // Ensures no duplicate holidays for the same date
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["admin", "government"], // Specifies the type of holiday
      default: "admin", // Default is admin-provided holidays
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

export const Holiday = mongoose.model("Holiday", HolidaySchema);
