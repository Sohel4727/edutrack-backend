// routes/leave.routes.js
import express from "express";
import { applyLeave, handleLeaveStatus, getUserLeaves, getPendingLeaves, cancelLeave } from "../controllers/leave.controller.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// User routes
router.post("/user/applyleave", verifyJWT, verifyRole(["user"]), applyLeave);
router.get("/user/leave", verifyJWT, verifyRole(["user"]), getUserLeaves);
// User cancels leave
router.delete("/user/cancel/:leaveId", verifyJWT, verifyRole(["user"]), cancelLeave);

// Admin routes
router.get("/admin/pending", verifyJWT, verifyRole(["admin"]), getPendingLeaves);
router.put("/admin/update/:leaveId", verifyJWT, verifyRole(["admin"]), handleLeaveStatus);

export default router;
