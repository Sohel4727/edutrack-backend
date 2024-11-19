import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Barcode } from "../models/barcode.model.js";

// POST: Generate or Set Barcode for a Specific Date
const generateOrSetBarcode = asyncHandler(async (req, res) => {
  const { date, code } = req.body;

  if (!date || !code) {
    throw new ApiError(400, "Date and code are required.");
  }

  // Check if a barcode for the given date already exists
  let barcode = await Barcode.findOne({ date });

  if (barcode) {
    barcode.code = code; // Update the code for the given date
  } else {
    barcode = await Barcode.create({ date, code }); // Create new entry
  }

  await barcode.save();

  return res
    .status(201)
    .json(new ApiResponse(201, barcode, `Barcode for ${date} saved successfully.`));
});

// GET: Retrieve Barcode for a Specific Date
const getBarcodeByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const barcode = await Barcode.findOne({ date });

  if (!barcode) {
    throw new ApiError(404, `No barcode found for ${date}.`);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, barcode, `Barcode for ${date} retrieved successfully.`));
});

export { generateOrSetBarcode, getBarcodeByDate };
