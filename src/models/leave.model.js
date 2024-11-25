import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    type: { type: String, enum: ["full-day", "half-day"], required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "canceled"],
      default: "pending",
    },
    reason: { type: String, required: false }, // Optional leave reason
  },
  { timestamps: true }
);

export const Leave = mongoose.model('Leave',leaveSchema)