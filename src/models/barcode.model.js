// import mongoose from "mongoose";

// const barcodeSchema = new mongoose.Schema({
//   date: {
//     type: String, // Store date as YYYY-MM-DD
//     required: true,
//     unique: true,
//   },
//   code: {
//     type: String,
//     required: true,
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export const Barcode = mongoose.model("Barcode", barcodeSchema);

import mongoose from "mongoose";

const dateCodeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // YYYY-MM-DD format
  code: { type: String, required: true }, // Random 4-digit code
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // TTL index for auto deletion
});

export const  Barcode= mongoose.model("Barcode", dateCodeSchema);

