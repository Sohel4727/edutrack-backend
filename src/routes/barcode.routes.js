import { Router } from "express";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
import {
  generateOrSetBarcode,
  getBarcodeByDate,
} from "../controllers/barcode.controller.js";

const router = Router();

// Admin can generate or set barcode for a date
router.post("/set", verifyJWT, verifyRole(["admin"]), generateOrSetBarcode);

// Get barcode for a specific date
router.get("/:date", verifyJWT, verifyRole(["admin"]), getBarcodeByDate);

export default router;
