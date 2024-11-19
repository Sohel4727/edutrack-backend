// // routes/attendance.routes.js
// import { Router } from "express";
// import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";
// import {
  //   generateDailyBarcode,
  //   viewAttendanceRecords,
  //   viewUserAttendance,
  //   markHoliday,
  //   userMarkAttendance,
  //   userAttendanceHistory,
  // } from "../controllers/attendance.controller.js";

// const router = Router();

// // Admin routes - require "admin" role
// router
//   .route("/admin/generateBarcode")
//   .post(verifyJWT, verifyRole(['admin']), generateDailyBarcode);
// router
//   .route("/admin/viewAttendance")
//   .get(verifyJWT, verifyRole(['admin']), viewAttendanceRecords);
// // router.get(
  // //   "/user/:userId",
  // //   verifyJWT,
// //   verifyRole(['3']),
// //   viewUserAttendance
// // );
// router
//   .route("/admin/markHoliday")
//   .post(verifyJWT, verifyRole(['admin']), markHoliday);

// // User routes - require "user" role
// router
//   .route("/user/markAttendance")
//   .post(verifyJWT, verifyRole(["user"]), userMarkAttendance);
// router
//   .route("/user/attendance")
//   .get(verifyJWT, verifyRole(["user"]), userAttendanceHistory);

// export default router;


import express from "express";
import { getUserAttendance, markAttendance,getAllUsersAttendanceSummary,getSingleUserAttendanceSummary,addHoliday } from "../controllers/attendance.controller.js";
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js";


const router = express.Router();

router.post("/mark", verifyJWT,verifyRole(["user"]), markAttendance);
// router.get("/user/:userId", verifyJWT,verifyRole(["user"]), getUserAttendance);
router.get("/summary", verifyJWT,verifyRole(["user"]), getUserAttendance);

// for admin
// Fetch all users with attendance summary
router.get("/admin/userAttendanceSummary", verifyJWT, verifyRole(["admin"]), getAllUsersAttendanceSummary);

// Fetch single user attendance summary
router.get("/admin/userAttendance/:userId", verifyJWT, verifyRole(["admin"]), getSingleUserAttendanceSummary);

// Add a holiday
router.post("/admin/addHoliday", verifyJWT, verifyRole(["admin"]), addHoliday);

export default router;
