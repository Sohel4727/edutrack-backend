// controllers/leave.controller.js
import { Leave } from "../models/leave.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getWorkingDaysWithSundays } from "../utils/dateUtils.js";
import { format } from "date-fns"; // Ensure date-fns is imported


const applyLeave = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { date, type, reason } = req.body;

  if (!date || !type) {
    throw new ApiError(400, "Date and leave type are required.");
  }

  // Ensure the leave date is in the future
  const today = format(new Date(), "yyyy-MM-dd"); // Get today's date in YYYY-MM-DD format
  if (date <= today) {
    throw new ApiError(400, "Leave can only be applied for future dates.");
  }

  // Check if leave already exists for the same date
  // const existingLeave = await Leave.findOne({ user: userId, date });
  // if (existingLeave) {
  //   throw new ApiError(400, "Leave already applied for the selected date.");
  // }

  // Create leave request
  const leave = await Leave.create({
    user: userId,
    date,
    type,
    reason,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, leave, "Leave applied successfully."));
});


// Admin: Approve or Reject Leave
const handleLeaveStatus = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const { status } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    throw new ApiError(
      400,
      "Invalid status. Only 'approved' or 'rejected' allowed."
    );
  }

  // Update the leave status
  const leave = await Leave.findByIdAndUpdate(
    leaveId,
    { status },
    { new: true }
  );

  if (!leave) {
    throw new ApiError(404, "Leave request not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, leave, `Leave ${status} successfully.`));
});

// Get User's Leave Requests
const getUserLeaves = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch all leaves for the user
  const leaves = await Leave.find({ user: userId }).sort("date");

  return res
    .status(200)
    .json(
      new ApiResponse(200, leaves, "User leave requests fetched successfully.")
    );
});

// Get All Pending Leaves (Admin)

const getPendingLeaves = asyncHandler(async (req, res) => {
  // Fetch all pending leaves
  const pendingLeaves = await Leave.find({ status: "pending" }).populate(
    "user",
    "username email"
  );

  if (!pendingLeaves.length) {
    return res.status(404).json(new ApiResponse(404, [], "No pending leave requests found."));
  }
  

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        pendingLeaves,
        "Pending leave requests fetched successfully."
      )
    );
});

// Cancel Leave
const cancelLeave = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { leaveId } = req.params;

  const leave = await Leave.findOneAndUpdate(
    { _id: leaveId, user: userId, status: "pending" },
    { status: "canceled" },
    { new: true }
  );

  if (!leave) {
    throw new ApiError(404, "Leave request not found or already processed.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, leave, "Leave canceled successfully."));
});


export { applyLeave, handleLeaveStatus, getPendingLeaves, getUserLeaves,cancelLeave };
