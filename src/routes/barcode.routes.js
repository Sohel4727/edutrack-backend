// import { Router } from "express";
// import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
// import {
//   generateOrSetBarcode,
//   getBarcodeByDate,
// } from "../controllers/barcode.controller.js";

// const router = Router();

// // Admin can generate or set barcode for a date
// router.post("/set", verifyJWT, verifyRole(["admin"]), generateOrSetBarcode);

// // Get barcode for a specific date
// router.get("/:date", verifyJWT, verifyRole(["admin"]), getBarcodeByDate);

// export default router;
// // Admin can generate or set barcode for a date
// router.post("/set", verifyJWT, verifyRole(["admin"]), generateOrSetBarcode);
// // Get barcode for a specific date
// router.get("/:date", verifyJWT, verifyRole(["admin"]), getBarcodeByDate);


import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import { getDateCode } from "../controllers/barcode.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();


// Admin can generate or set barcode for a current date
router.post(
  "/set",
  verifyJWT,
  verifyRole(["admin"]),
  asyncHandler(getDateCode)
);

export default router;
