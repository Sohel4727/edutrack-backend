// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiResponse } from "../utils/ApiResponse.js";
// import { ApiError } from "../utils/ApiError.js";
// import { Barcode } from "../models/barcode.model.js";

// // POST: Generate or Set Barcode for a Specific Date
// const generateOrSetBarcode = asyncHandler(async (req, res) => {
//   const { date, code } = req.body;

//   if (!date || !code) {
//     throw new ApiError(400, "Date and code are required.");
//   }

//   // Check if a barcode for the given date already exists
//   let barcode = await Barcode.findOne({ date });

//   if (barcode) {
//     barcode.code = code; // Update the code for the given date
//   } else {
//     barcode = await Barcode.create({ date, code }); // Create new entry
//   }

//   await barcode.save();

//   return res
//     .status(201)
//     .json(new ApiResponse(201, barcode, `Barcode for ${date} saved successfully.`));
// });

// // GET: Retrieve Barcode for a Specific Date
// const getBarcodeByDate = asyncHandler(async (req, res) => {
//   const { date } = req.params;

//   if (!date) {
//     throw new ApiError(400, "Date is required.");
//   }

//   const barcode = await Barcode.findOne({ date });

//   if (!barcode) {
//     throw new ApiError(404, `No barcode found for ${date}.`);
//   }

//   return res
//     .status(200)
//     .json(new ApiResponse(200, barcode, `Barcode for ${date} retrieved successfully.`));
// });

// export { generateOrSetBarcode, getBarcodeByDate };

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

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!isValidDate) {
    throw new ApiError(400, "Invalid date format. Expected format: YYYY-MM-DD.");
  }

  let barcode = await Barcode.findOne({ date });

  if (barcode) {
    barcode.code = code;
    await barcode.save();
    return res
      .status(200)
      .json(new ApiResponse(200, barcode, `Barcode updated for ${date}.`));
  } else {
    barcode = await Barcode.create({ date, code });
    return res
      .status(201)
      .json(new ApiResponse(201, barcode, `Barcode saved for ${date}.`));
  }
});



// GET: Retrieve Barcode for a Specific Date
const getBarcodeByDate = asyncHandler(async (req, res) => {
  const { date } = req.params;

  if (!date) {
    throw new ApiError(400, "Date is required.");
  }

  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  if (!isValidDate) {
    throw new ApiError(400, "Invalid date format. Expected format: YYYY-MM-DD.");
  }

  let barcode = await Barcode.findOne({ date });

  if (!barcode) {
    // Generate a new code if none exists
    const newCode = Array(5)
      .fill(null)
      .map(() =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
          Math.floor(Math.random() * 36)
        )
      )
      .join("");
    barcode = await Barcode.create({ date, code: newCode });

    return res
      .status(201)
      .json(
        new ApiResponse(201, barcode, `No barcode found. Generated a new one for ${date}.`)
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        barcode,
        `Barcode for ${date} retrieved successfully.`
      )
    );
});



export { generateOrSetBarcode, getBarcodeByDate };
