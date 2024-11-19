import mongoose from "mongoose";

const barcodeSchema = new mongoose.Schema({
  date: {
    type: String, // Store date as YYYY-MM-DD
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Barcode = mongoose.model("Barcode", barcodeSchema);
