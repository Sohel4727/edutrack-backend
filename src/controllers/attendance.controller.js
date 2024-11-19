import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Attendance } from "../models/attendance.model.js";
import { Barcode } from "../models/barcode.model.js";
import { User } from "../models/auth.model.js";
import { Holiday } from "../models/holiday.model.js";
// POST: Mark Attendance with Barcode Validation
import { getWorkingDaysWithSundays } from "../utils/dateUtils.js"; // Keep the import here
import { format, parseISO } from "date-fns";
const markAttendance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { date, status, code } = req.body;

  if (!date || !status || !code) {
    throw new ApiError(400, "Date, status, and barcode code are required.");
  }

  // Validate barcode
  const barcode = await Barcode.findOne({ date });

  if (!barcode || barcode.code !== code) {
    throw new ApiError(400, "Invalid barcode or date.");
  }

  // Check if attendance for the given date is already marked
  const existingEntry = await Attendance.findOne({ user: userId, date });

  if (existingEntry) {
    throw new ApiError(400, `Attendance for ${date} is already marked.`);
  }

  // Mark attendance
  const attendance = await Attendance.create({
    user: userId,
    date,
    status,
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        attendance,
        `Attendance marked successfully for ${date}`
      )
    );
});

// Function to validate the attendance records for the given month
const getUserAttendance = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Fetch user details
  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  // Fetch attendance data for the user
  const attendanceData = await Attendance.find({ user: userId }).sort("date");

  // Fetch holidays added by admin
  const holidays = await Holiday.find({});
  const holidayDates = holidays.map((holiday) =>
    formatDateToLocal(holiday.date)
  );

  // Get the current year and month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Generate working days and Sundays for the current month
  const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

  // Build attendance details for each working day
  const attendanceDetails = workingDays.map((date) => {
    const formattedDate = formatDateToLocal(date);

    // Check if the date is a holiday (admin holiday)
    const isHoliday = holidayDates.includes(formattedDate);

    // Check if the date is a Sunday
    const isSunday = sundays.some(
      (sundayDate) => formatDateToLocal(sundayDate) === formattedDate
    );

    // Check if the user has an attendance record for this date
    const record = attendanceData.find(
      (entry) => formatDateToLocal(entry.date) === formattedDate
    );

    // Determine the status based on conditions
    let status = "absent"; // Default status
    if (isHoliday) {
      status = "holiday"; // Admin holiday is marked as holiday
    } else if (isSunday) {
      status = "present (Sunday)"; // Sundays are marked as present
    } else if (record && record.status === "present") {
      status = "present";
    }

    return {
      date: formattedDate,
      status,
    };
  });

  // Add Sundays explicitly to attendanceDetails
  const sundayDetails = sundays.map((sunday) => ({
    date: formatDateToLocal(sunday),
    status: "present (Sunday)",
  }));

  // Combine attendance details and Sunday details
  const combinedDetails = [...attendanceDetails, ...sundayDetails];

  // Sort by date to maintain chronological order
  combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate summary stats
  const totalPresent = combinedDetails.filter(
    (entry) => entry.status.startsWith("present") || entry.status === "holiday"
  ).length;

  // Calculate the total holidays
  const totalHolidays = holidayDates.length;

  // Calculate total number of days in the month (working days + holidays + weekends)
  const totalDaysInMonth = workingDays.length + totalHolidays + sundays.length;

  // Calculate total absent days
  const totalAbsent = totalDaysInMonth - totalPresent - totalHolidays;

  // Send response with the updated structure
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        totalPresent,
        totalAbsent,
        totalHolidays,
        attendanceDetails: combinedDetails,
      },
      "User attendance summary fetched successfully"
    )
  );
});

// GET: List all users (role: user) with attendance summary for the current month (November only)
const getAllUsersAttendanceSummary = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth(); // 0-indexed (0 = January, 10 = November)

  // Get working days and Sundays for the current month (November 2024)
  const { workingDays, sundays } = await getWorkingDaysWithSundays(year, month);

  // Fetch all holidays
  const holidays = await Holiday.find({});

  // Fetch all users with the role "user"
  const users = await User.find({ role: "user" }).select("-password"); // Exclude password
  if (!users.length) {
    throw new ApiError(404, "No users found.");
  }

  // Calculate attendance summary for each user
  const summary = await Promise.all(
    users.map(async (user) => {
      const attendance = await Attendance.find({
        user: user._id,
        date: { $in: workingDays.map((d) => formatDateToLocal(d)) }, // Fetch attendance only for the current month's working days
      });

      // Calculate total present days (including Sundays)
      const totalPresent =
        attendance.filter((a) => a.status === "present").length +
        sundays.length +
        holidays.length;

      // Calculate total absent days (considering holidays and Sundays)
      const totalAbsent =
        workingDays.length + sundays.length - totalPresent;

      return {
        ...user.toObject(),
        totalPresent,
        totalAbsent,
      };
    })
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        summary,
        "User attendance summary fetched successfully"
      )
    );
});

// Controller to get single user attendance summary
const getSingleUserAttendanceSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Fetch all holidays
  const holidays = await Holiday.find({});

  // Fetch user details
  const user = await User.findOne({ _id: userId, role: "user" }).select(
    "-password"
  );
  if (!user) {
    throw new ApiError(404, "User not found or invalid role.");
  }

  // Get working days and Sundays
  const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

  // Build the attendance query
  const query = {
    user: userId,
    date: { $in: workingDays.map((d) => formatDateToLocal(d)) }, // Ensure the date is in the correct format
  };

  // Fetch attendance records for the specific user and date range
  const attendance = await Attendance.find(query);

  // Count total present days, including Sundays and holidays
  const totalPresent =
    attendance.filter((a) => a.status === "present").length +
    sundays.length + // Add Sundays to the total present count
    holidays.length;

  // Calculate total absent days (subtract holidays and Sundays from working days)
  const totalAbsent = workingDays.length + sundays.length - totalPresent;

  // Format attendance details
  const attendanceDetails = workingDays.map((date) => {
    const formattedDate = formatDateToLocal(date);

    // Check if the date is a holiday
    const isHoliday = holidays.some((h) => {
      const holidayDate = formatDateToLocal(h.date);
      return holidayDate === formattedDate;
    });

    // Check if the date is a Sunday
    const isSunday = sundays.some(
      (d) => formatDateToLocal(d) === formattedDate
    );

    // Check if the user has an attendance record for this date
    const record = attendance.find((a) => {
      const attendanceDate = formatDateToLocal(a.date);
      return attendanceDate === formattedDate;
    });

    // Determine the status based on the conditions
    let status = "absent"; // Default status is absent
    if (isHoliday) {
      status = "holiday";
    } else if (isSunday) {
      status = "present (Sunday)"; // Mark Sundays as present
    } else if (record && record.status === "present") {
      status = "present";
    }

    return {
      date: formattedDate,
      status: status,
    };
  });

  // Add Sundays to the attendanceDetails array with the correct status
  const sundayDetails = sundays.map((sunday) => ({
    date: formatDateToLocal(sunday),
    status: "present (Sunday)",
  }));

  // Combine both attendance details and Sunday details
  const combinedDetails = [...attendanceDetails, ...sundayDetails];

  // Sort by date to maintain chronological order
  combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Return the response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...user.toObject(),
        totalPresent,
        totalAbsent,
        totalHolidays: holidays.length,
        attendanceDetails: combinedDetails,
      },
      "User attendance summary fetched successfully"
    )
  );
});

// Utility function for date formatting
const formatDateToLocal = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// POST: Admin adds holiday for a specific date
const addHoliday = asyncHandler(async (req, res) => {
  const { date, description } = req.body;

  if (!date || !description) {
    throw new ApiError(400, "Date and description are required.");
  }

  // Check if the date is already a holiday
  const existingHoliday = await Holiday.findOne({ date });
  if (existingHoliday) {
    throw new ApiError(400, "Holiday already exists for this date.");
  }

  // Create a holiday record
  const holiday = await Holiday.create({ date, description });

  // Mark all users as holiday on this holiday date
  await Attendance.updateMany({ date }, { status: "holiday" });

  return res
    .status(201)
    .json(new ApiResponse(201, holiday, "Holiday added successfully"));
});

export {
  markAttendance,
  getUserAttendance,
  getAllUsersAttendanceSummary,
  getSingleUserAttendanceSummary,
  addHoliday,
};
