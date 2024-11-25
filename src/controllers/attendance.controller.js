import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Attendance } from "../models/attendance.model.js";
import { Barcode } from "../models/barcode.model.js";
import { User } from "../models/auth.model.js";
import { Holiday } from "../models/holiday.model.js";
import { Leave } from "../models/leave.model.js";
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

  // Mark attendance with exact time
  const attendance = await Attendance.create({
    user: userId,
    date,
    status,
    time: new Date(), // Store the exact current timestamp
  });

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        attendance,
        `Attendance marked successfully for ${date} at ${attendance.time}`
      )
    );
});

// Function to validate the attendance records for the given month
// const getUserAttendance = asyncHandler(async (req, res) => {
//   const userId = req.user._id;

//   // Fetch user details
//   const user = await User.findById(userId).select("-password");
//   if (!user) {
//     throw new ApiError(404, "User not found.");
//   }

//   // Fetch attendance data for the user
//   const attendanceData = await Attendance.find({ user: userId }).sort("date");

//   // Fetch holidays added by admin
//   const holidays = await Holiday.find({});
//   const holidayDates = holidays.map((holiday) =>
//     formatDateToLocal(holiday.date)
//   );

//   // Get the current year and month
//   const today = new Date();
//   const year = today.getFullYear();
//   const month = today.getMonth();

//   // Generate working days and Sundays for the current month
//   const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

//   // Build attendance details for each working day
//   const attendanceDetails = workingDays.map((date) => {
//     const formattedDate = formatDateToLocal(date);

//     // Check if the date is a holiday (admin holiday)
//     const isHoliday = holidayDates.includes(formattedDate);

//     // Check if the date is a Sunday
//     const isSunday = sundays.some(
//       (sundayDate) => formatDateToLocal(sundayDate) === formattedDate
//     );

//     // Check if the user has an attendance record for this date
//     const record = attendanceData.find(
//       (entry) => formatDateToLocal(entry.date) === formattedDate
//     );

//     // Determine the status based on conditions
//     let status = "absent"; // Default status
//     if (isHoliday) {
//       status = "holiday"; // Admin holiday is marked as holiday
//     } else if (isSunday) {
//       status = "sunday"; // Sundays are marked as present
//     } else if (record && record.status === "present") {
//       status = "present";
//     }

//     return {
//       date: formattedDate,
//       status,
//     };
//   });

//   // Add Sundays explicitly to attendanceDetails
//   const sundayDetails = sundays.map((sunday) => ({
//     date: formatDateToLocal(sunday),
//     status: "sunday",
//   }));

//   // Combine attendance details and Sunday details
//   const combinedDetails = [...attendanceDetails, ...sundayDetails];

//   // Sort by date to maintain chronological order
//   combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

//   // Calculate summary stats
//   const totalPresent = combinedDetails.filter(
//     (entry) => entry.status.startsWith("present") || entry.status === "holiday"
//   ).length;

//   // Calculate the total holidays
//   const totalHolidays = holidayDates.length;

//   // Calculate total number of days in the month (working days + holidays + weekends)
//   const totalDaysInMonth = workingDays.length + totalHolidays + sundays.length;

//   // Calculate total absent days
//   const totalAbsent = totalDaysInMonth - totalPresent - totalHolidays;

//   // Send response with the updated structure
//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         _id: user._id,
//         username: user.username,
//         email: user.email,
//         role: user.role,
//         avatar: user.avatar,
//         createdAt: user.createdAt,
//         updatedAt: user.updatedAt,
//         totalPresent,
//         totalAbsent,
//         totalHolidays,
//         attendanceDetails: combinedDetails,
//       },
//       "User attendance summary fetched successfully"
//     )
//   );
// });

const getUserAttendance = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth();

  if (req.query.year && req.query.month) {
    year = parseInt(req.query.year, 10);
    month = parseInt(req.query.month, 10) - 1;
  }

  if (month < 0 || month > 11) {
    throw new ApiError(
      400,
      "Invalid month parameter. Must be between 1 and 12."
    );
  }

  const user = await User.findById(userId).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const attendanceData = await Attendance.find({ user: userId }).sort("date");

  const leaveData = await Leave.find({ user: userId });
  const holidays = await Holiday.find({});
  const holidayDates = holidays
    .filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return (
        holidayDate.getFullYear() === year && holidayDate.getMonth() === month
      );
    })
    .map((holiday) => formatDateToLocal(holiday.date));

  const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

  const attendanceDetails = workingDays.map((date) => {
    const formattedDate = formatDateToLocal(date);

    const isHoliday = holidayDates.includes(formattedDate);
    const isSunday = sundays.some(
      (sundayDate) => formatDateToLocal(sundayDate) === formattedDate
    );

    const leave = leaveData.find(
      (leave) =>
        leave.status === "approved" &&
        formatDateToLocal(leave.date) === formattedDate
    );

    const leaveStatus =
      leave && leave.type === "full-day"
        ? "L/F"
        : leave && leave.type === "half-day"
          ? "L/H"
          : null;

    const record = attendanceData.find(
      (entry) => formatDateToLocal(entry.date) === formattedDate
    );

    let status = "absent";
    let time = null;
    if (isHoliday) {
      status = "holiday";
    } else if (isSunday) {
      status = "sunday";
    } else if (leaveStatus) {
      status = leaveStatus;
    } else if (record && record.status === "present") {
      status = "present";
      time = record.time; // Use the stored time value
    }

    return {
      date: formattedDate,
      status,
      time, // Return stored time value
    };
  });

  const sundayDetails = sundays.map((sunday) => ({
    date: formatDateToLocal(sunday),
    status: "sunday",
    time: null,
  }));

  const combinedDetails = [...attendanceDetails, ...sundayDetails];
  combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

  const approvedLeavesForMonth = leaveData.filter(
    (leave) =>
      leave.status === "approved" &&
      new Date(leave.date).getFullYear() === year &&
      new Date(leave.date).getMonth() === month
  );

  const totalPresent =
    combinedDetails.filter(
      (entry) =>
        entry.status.startsWith("present") ||
        entry.status === "holiday" ||
        entry.status === "sunday"
    ).length + approvedLeavesForMonth.length;

  const totalHolidays = holidayDates.length;
  const totalDaysInMonth = workingDays.length + totalHolidays + sundays.length;
  const totalAbsent = totalDaysInMonth - totalPresent - totalHolidays;

  const leaveSummary = {
    totalApprovedLeaves: leaveData.filter(
      (leave) => leave.status === "approved"
    ).length,
    totalRejectedLeaves: leaveData.filter(
      (leave) => leave.status === "rejected"
    ).length,
    totalApprovedFullDayLeaves: leaveData.filter(
      (leave) => leave.status === "approved" && leave.type === "full-day"
    ).length,
    totalApprovedHalfDayLeaves: leaveData.filter(
      (leave) => leave.status === "approved" && leave.type === "half-day"
    ).length,
    approvedLeaveCurrentMonth:
      approvedLeavesForMonth.length > 0
        ? approvedLeavesForMonth.length
        : "No leave applied this month",
  };

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
        leaveSummary,
      },
      "User attendance summary fetched successfully"
    )
  );
});

// GET: List all users (role: user) with attendance summary for the current month (November only)
// const getAllUsersAttendanceSummary = asyncHandler(async (req, res) => {
//   const year = new Date().getFullYear();
//   const month = new Date().getMonth(); // 0-indexed (0 = January, 10 = November)

//   // Get working days and Sundays for the current month (November 2024)
//   const { workingDays, sundays } = await getWorkingDaysWithSundays(year, month);

//   // Fetch all holidays
//   const holidays = await Holiday.find({});

//   // Fetch all users with the role "user"
//   const users = await User.find({ role: "user" }).select("-password"); // Exclude password
//   if (!users.length) {
//     throw new ApiError(404, "No users found.");
//   }

//   // Calculate attendance summary for each user
//   const summary = await Promise.all(
//     users.map(async (user) => {
//       const attendance = await Attendance.find({});
//       // const attendance = await Attendance.find({
//       //   user: user._id,
//       //   date: { $in: workingDays.map((d) => formatDateToLocal(d)) }, // Fetch attendance only for the current month's working days
//       // });

//       // Calculate total present days (including Sundays)
//       const totalPresent =
//         attendance.filter((a) => a.status === "present").length +
//         sundays.length;

//       // Calculate total absent days (considering holidays and Sundays)
//       const totalAbsent = workingDays.length + sundays.length - totalPresent;

//       // Format attendance details
//       const attendanceDetails = workingDays.map((date) => {
//         const formattedDate = formatDateToLocal(date);

//         // Check if the date is a holiday
//         const isHoliday = holidays.some((h) => {
//           const holidayDate = formatDateToLocal(h.date);
//           return holidayDate === formattedDate;
//         });

//         // Check if the date is a Sunday
//         const isSunday = sundays.some(
//           (d) => formatDateToLocal(d) === formattedDate
//         );

//         // Check if the user has an attendance record for this date
//         const record = attendance.find((a) => {
//           const attendanceDate = formatDateToLocal(a.date);
//           return attendanceDate === formattedDate;
//         });

//         // Determine the status based on the conditions
//         let status = "absent"; // Default status is absent
//         if (isHoliday) {
//           status = "holiday";
//         } else if (isSunday) {
//           status = "sunday"; // Mark Sundays as present
//         } else if (record && record.status === "present") {
//           status = "present";
//         }

//         return {
//           date: formattedDate,
//           status: status,
//         };
//       });

//       // Add Sundays to the attendanceDetails array with the correct status
//       const sundayDetails = sundays.map((sunday) => ({
//         date: formatDateToLocal(sunday),
//         status: "sunday",
//       }));

//       // Combine both attendance details and Sunday details
//       const combinedDetails = [...attendanceDetails, ...sundayDetails];

//       // Sort by date to maintain chronological order
//       combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

//       return {
//         ...user.toObject(),
//         totalPresent,
//         totalAbsent,
//         combinedDetails,
//       };
//     })
//   );

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(
//         200,
//         summary,
//         "User attendance summary fetched successfully"
//       )
//     );
// });

const getAllUsersAttendanceSummary = asyncHandler(async (req, res) => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();

  const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

  const holidays = await Holiday.find({});

  const users = await User.find({ role: "user" }).select("-password");
  if (!users.length) {
    throw new ApiError(404, "No users found.");
  }

  const summary = await Promise.all(
    users.map(async (user) => {
      const attendance = await Attendance.find({ user: user._id });
      const leaveData = await Leave.find({ user: user._id });

      const attendanceDetails = workingDays.map((date) => {
        const formattedDate = formatDateToLocal(date);

        const isHoliday = holidays.some(
          (h) => formatDateToLocal(h.date) === formattedDate
        );

        const isSunday = sundays.some(
          (d) => formatDateToLocal(d) === formattedDate
        );

        const record = attendance.find(
          (a) => formatDateToLocal(a.date) === formattedDate
        );

        const leave = leaveData.find(
          (leave) =>
            leave.status === "approved" &&
            formatDateToLocal(leave.date) === formattedDate
        );

        const leaveStatus =
          leave && leave.type === "full-day"
            ? "L/F"
            : leave && leave.type === "half-day"
              ? "L/H"
              : null;

        let status = "absent";
        let time = null; // Initialize time as null
        if (isHoliday) {
          status = "holiday";
        } else if (isSunday) {
          status = "sunday";
        } else if (leaveStatus) {
          status = leaveStatus;
        } else if (record && record.status === "present") {
          status = "present";
          time = record.time; // Include the stored time value when the user is present
        }

        return { date: formattedDate, status, time }; // Include time in the response
      });

      const sundayDetails = sundays.map((sunday) => ({
        date: formatDateToLocal(sunday),
        status: "sunday",
        time: null, // Sundays do not have specific time
      }));

      const combinedDetails = [...attendanceDetails, ...sundayDetails].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      const totalPresent =
        combinedDetails.filter(
          (entry) =>
            entry.status.startsWith("present") ||
            entry.status === "holiday" ||
            entry.status === "sunday"
        ).length +
        leaveData.filter((leave) => leave.status === "approved").length;

      const totalAbsent = workingDays.length + sundays.length - totalPresent;

      return {
        ...user.toObject(),
        totalPresent,
        totalAbsent,
        attendanceDetails: combinedDetails,
        leaveSummary: {
          totalApprovedLeaves: leaveData.filter(
            (leave) => leave.status === "approved"
          ).length,
          totalRejectedLeaves: leaveData.filter(
            (leave) => leave.status === "rejected"
          ).length,
          totalApprovedFullDayLeaves: leaveData.filter(
            (leave) => leave.status === "approved" && leave.type === "full-day"
          ).length,
          totalApprovedHalfDayLeaves: leaveData.filter(
            (leave) => leave.status === "approved" && leave.type === "half-day"
          ).length,
        },
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
// const getSingleUserAttendanceSummary = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const currentDate = new Date();
//   const year = currentDate.getFullYear();
//   const month = currentDate.getMonth();

//   // Fetch all holidays
//   const holidays = await Holiday.find({});

//   // Fetch user details
//   const user = await User.findOne({ _id: userId, role: "user" }).select(
//     "-password"
//   );
//   if (!user) {
//     throw new ApiError(404, "User not found or invalid role.");
//   }

//   // Get working days and Sundays
//   const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

//   // Build the attendance query
//   const query = {
//     user: userId,
//     date: { $in: workingDays.map((d) => formatDateToLocal(d)) }, // Ensure the date is in the correct format
//   };

//   // Fetch attendance records for the specific user and date range
//   const attendance = await Attendance.find(query);

//   // Count total present days, including Sundays and holidays
//   const totalPresent =
//     attendance.filter((a) => a.status === "present").length +
//     sundays.length + // Add Sundays to the total present count
//     holidays.length;

//   // Calculate total absent days (subtract holidays and Sundays from working days)
//   const totalAbsent = workingDays.length + sundays.length - totalPresent;

//   // Format attendance details
//   const attendanceDetails = workingDays.map((date) => {
//     const formattedDate = formatDateToLocal(date);

//     // Check if the date is a holiday
//     const isHoliday = holidays.some((h) => {
//       const holidayDate = formatDateToLocal(h.date);
//       return holidayDate === formattedDate;
//     });

//     // Check if the date is a Sunday
//     const isSunday = sundays.some(
//       (d) => formatDateToLocal(d) === formattedDate
//     );

//     // Check if the user has an attendance record for this date
//     const record = attendance.find((a) => {
//       const attendanceDate = formatDateToLocal(a.date);
//       return attendanceDate === formattedDate;
//     });

//     // Determine the status based on the conditions
//     let status = "absent"; // Default status is absent
//     if (isHoliday) {
//       status = "holiday";
//     } else if (isSunday) {
//       status = "sunday"; // Mark Sundays as present
//     } else if (record && record.status === "present") {
//       status = "present";
//     }

//     return {
//       date: formattedDate,
//       status: status,
//     };
//   });

//   // Add Sundays to the attendanceDetails array with the correct status
//   const sundayDetails = sundays.map((sunday) => ({
//     date: formatDateToLocal(sunday),
//     status: "sunday",
//   }));

//   // Combine both attendance details and Sunday details
//   const combinedDetails = [...attendanceDetails, ...sundayDetails];

//   // Sort by date to maintain chronological order
//   combinedDetails.sort((a, b) => new Date(a.date) - new Date(b.date));

//   // Return the response
//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         ...user.toObject(),
//         totalPresent,
//         totalAbsent,
//         totalHolidays: holidays.length,
//         attendanceDetails: combinedDetails,
//       },
//       "User attendance summary fetched successfully"
//     )
//   );
// });
// const getSingleUserAttendanceSummary = asyncHandler(async (req, res) => {
//   const { userId } = req.params;
//   const currentDate = new Date();
//   const year = currentDate.getFullYear();
//   const month = currentDate.getMonth();

//   const holidays = await Holiday.find({});

//   const user = await User.findOne({ _id: userId, role: "user" }).select(
//     "-password"
//   );
//   if (!user) {
//     throw new ApiError(404, "User not found or invalid role.");
//   }

//   const { workingDays, sundays } = getWorkingDaysWithSundays(year, month);

//   const attendance = await Attendance.find({ user: userId });
//   const leaveData = await Leave.find({ user: userId });

//   const attendanceDetails = workingDays.map((date) => {
//     const formattedDate = formatDateToLocal(date);

//     const isHoliday = holidays.some(
//       (h) => formatDateToLocal(h.date) === formattedDate
//     );

//     const isSunday = sundays.some(
//       (d) => formatDateToLocal(d) === formattedDate
//     );

//     const record = attendance.find(
//       (a) => formatDateToLocal(a.date) === formattedDate
//     );

//     const leave = leaveData.find(
//       (leave) =>
//         leave.status === "approved" &&
//         formatDateToLocal(leave.date) === formattedDate
//     );

//     const leaveStatus =
//       leave && leave.type === "full-day"
//         ? "L/F"
//         : leave && leave.type === "half-day"
//           ? "L/H"
//           : null;

//     let status = "absent";
//     if (isHoliday) {
//       status = "holiday";
//     } else if (isSunday) {
//       status = "sunday";
//     } else if (leaveStatus) {
//       status = leaveStatus;
//     } else if (record && record.status === "present") {
//       status = "present";
//     }

//     return { date: formattedDate, status };
//   });

//   const sundayDetails = sundays.map((sunday) => ({
//     date: formatDateToLocal(sunday),
//     status: "sunday",
//   }));

//   const combinedDetails = [...attendanceDetails, ...sundayDetails].sort(
//     (a, b) => new Date(a.date) - new Date(b.date)
//   );
//   const totalPresent =
//     combinedDetails.filter(
//       (entry) =>
//         entry.status.startsWith("present") || entry.status === "holiday"
//     ).length + leaveData.filter((leave) => leave.status === "approved").length;

//   const totalAbsent = workingDays.length + sundays.length - totalPresent;

//   return res.status(200).json(
//     new ApiResponse(
//       200,
//       {
//         ...user.toObject(),
//         totalPresent,
//         totalAbsent,
//         attendanceDetails: combinedDetails,
//         leaveSummary: {
//           totalApprovedLeaves: leaveData.filter(
//             (leave) => leave.status === "approved"
//           ).length,
//           totalRejectedLeaves: leaveData.filter(
//             (leave) => leave.status === "rejected"
//           ).length,
//           totalApprovedFullDayLeaves: leaveData.filter(
//             (leave) => leave.status === "approved" && leave.type === "full-day"
//           ).length,
//           totalApprovedHalfDayLeaves: leaveData.filter(
//             (leave) => leave.status === "approved" && leave.type === "half-day"
//           ).length,
//         },
//       },
//       "User attendance summary fetched successfully"
//     )
//   );
// });

const getSingleUserAttendanceSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { year, month } = req.query; // Get year and month from query params

  // Validate month and year
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const selectedYear = year ? parseInt(year) : currentYear; // Default to current year
  const selectedMonth = month ? parseInt(month) - 1 : currentMonth; // Default to current month (0-indexed)

  // Check for future dates (allowing them, but no attendance data for future months yet)
  if (
    selectedYear > currentYear ||
    (selectedYear === currentYear && selectedMonth > currentMonth)
  ) {
    return res.status(200).json({
      message:
        "Attendance data for the future month will be available once recorded.",
      data: [], // Empty data for future months
    });
  }

  // Fetch holidays and user data
  const holidays = await Holiday.find({});
  const user = await User.findOne({ _id: userId, role: "user" }).select(
    "-password"
  );

  if (!user) {
    throw new ApiError(404, "User not found or invalid role.");
  }

  // Get working days and Sundays for the requested month and year
  const { workingDays, sundays } = getWorkingDaysWithSundays(
    selectedYear,
    selectedMonth
  );

  // Fetch attendance and leave data
  const attendance = await Attendance.find({ user: userId });
  const leaveData = await Leave.find({ user: userId });

  // Process attendance data
  const attendanceDetails = workingDays.map((date) => {
    const formattedDate = formatDateToLocal(date);

    const isHoliday = holidays.some(
      (h) => formatDateToLocal(h.date) === formattedDate
    );

    const isSunday = sundays.some(
      (d) => formatDateToLocal(d) === formattedDate
    );

    const record = attendance.find(
      (a) => formatDateToLocal(a.date) === formattedDate
    );

    const leave = leaveData.find(
      (leave) =>
        leave.status === "approved" &&
        formatDateToLocal(leave.date) === formattedDate
    );

    const leaveStatus =
      leave && leave.type === "full-day"
        ? "L/F"
        : leave && leave.type === "half-day"
          ? "L/H"
          : null;

    let status = "absent";
    let time = null; // Initialize time as null
    if (isHoliday) {
      status = "holiday";
    } else if (isSunday) {
      status = "sunday";
    } else if (leaveStatus) {
      status = leaveStatus;
    } else if (record && record.status === "present") {
      status = "present";
      time = record.time; // Include the stored time value when the user is present
    }

    return { date: formattedDate, status, time }; // Include time in the response
  });

  const sundayDetails = sundays.map((sunday) => ({
    date: formatDateToLocal(sunday),
    status: "sunday",
  }));

  const combinedDetails = [...attendanceDetails, ...sundayDetails].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Calculate total present, absent, and holidays
  const totalHolidays = combinedDetails.filter(
    (entry) => entry.status === "holiday"
  ).length;
  const totalPresent =
    combinedDetails.filter(
      (entry) =>
        entry.status.startsWith("present") ||
        entry.status === "holiday" ||
        entry.status === "sunday"
    ).length +
    leaveData.filter(
      (leave) =>
        leave.status === "approved" &&
        formatDateToLocal(leave.date) >=
          `${selectedYear}-${(selectedMonth + 1)
            .toString()
            .padStart(2, "0")}-01` &&
        formatDateToLocal(leave.date) <=
          `${selectedYear}-${(selectedMonth + 1)
            .toString()
            .padStart(
              2,
              "0"
            )}-${new Date(selectedYear, selectedMonth + 1, 0).getDate()}`
    ).length;

  const totalAbsent = workingDays.length + sundays.length - totalPresent;

  // Calculate approved leaves for the current month
  const approvedLeavesForMonth = leaveData.filter(
    (leave) =>
      leave.status === "approved" &&
      new Date(leave.date).getFullYear() === selectedYear &&
      new Date(leave.date).getMonth() === selectedMonth
  );

  // Generate leaveSummary with approvedLeaveCurrentMonth key
  const leaveSummary = {
    totalApprovedLeaves: leaveData.filter(
      (leave) => leave.status === "approved"
    ).length,
    totalRejectedLeaves: leaveData.filter(
      (leave) => leave.status === "rejected"
    ).length,
    totalApprovedFullDayLeaves: leaveData.filter(
      (leave) => leave.status === "approved" && leave.type === "full-day"
    ).length,
    totalApprovedHalfDayLeaves: leaveData.filter(
      (leave) => leave.status === "approved" && leave.type === "half-day"
    ).length,
    approvedLeaveCurrentMonth:
      approvedLeavesForMonth.length > 0
        ? approvedLeavesForMonth.length
        : "No leave applied this month",
  };

  // Return response
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...user.toObject(),
        totalPresent,
        totalAbsent,
        totalHolidays,
        attendanceDetails: combinedDetails,
        leaveSummary,
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

// GET: Fetch all holidays with description and date, sorted by date
// const getAllHolidays = asyncHandler(async (req, res) => {
//   try {
//     // Fetch holidays and sort by date in ascending order
//     const holidays = await Holiday.find()
//       .select("date description -_id")
//       .sort({ date: 1 }); // Sort by date (1 for ascending, -1 for descending)

//     if (!holidays.length) {
//       return res
//         .status(404)
//         .json(
//           new ApiResponse(
//             404,
//             { totalHolidays: 0, holidays: [] },
//             "No holidays found"
//           )
//         );
//     }

//     const totalHolidays = holidays.length;

//     return res
//       .status(200)
//       .json(
//         new ApiResponse(
//           200,
//           { totalHolidays, holidays },
//           "Holidays fetched successfully"
//         )
//       );
//   } catch (error) {
//     throw new ApiError(500, "Error fetching holidays");
//   }
// });

// GET: Fetch all holidays (admin-provided and government holidays)
const getAllHolidays = asyncHandler(async (req, res) => {
  try {
    // Fetch admin-provided holidays from the database
    const adminHolidays = await Holiday.find({ type: "admin" })
      .select("date description -_id")
      .sort({ date: 1 });

    // Format the admin holidays' dates
    const formattedAdminHolidays = adminHolidays.map((holiday) => ({
      date: formatDateToLocal(holiday.date),
      description: holiday.description,
    }));

    // Fetch government holidays from the database
    const governmentHolidays = await Holiday.find({ type: "government" })
      .select("date description -_id")
      .sort({ date: 1 });

    // Format the government holidays' dates
    const formattedGovernmentHolidays = governmentHolidays.map((holiday) => ({
      date: formatDateToLocal(holiday.date),
      description: holiday.description,
    }));

    // Combine admin and government holidays
    const holidaysResponse = {
      adminHolidays: formattedAdminHolidays,
      governmentHolidays: formattedGovernmentHolidays,
    };

    // Send the combined response
    return res
      .status(200)
      .json(
        new ApiResponse(200, holidaysResponse, "Holidays fetched successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Error fetching holidays");
  }
});


// POST: Bulk add government holidays

const addGovernmentHolidays = asyncHandler(async (req, res) => {
  const { holidays } = req.body; // Expect an array of government holidays

  if (!holidays || !Array.isArray(holidays)) {
    throw new ApiError(400, "Invalid input. 'holidays' should be an array.");
  }

  // Validate and prepare holiday data
  const governmentHolidays = holidays.map(({ date, description }) => {
    // Format the date using your utility function
    const formattedDate = formatDateToLocal(date);

    if (isNaN(new Date(formattedDate))) {
      throw new ApiError(
        400,
        `Invalid date format for holiday: ${date}. Expected format: YYYY-MM-DD.`
      );
    }

    return {
      date: formattedDate,
      description,
      type: "government",
    };
  });

  try {
    // Use `insertMany` for batch insertion
    const result = await Holiday.insertMany(governmentHolidays, {
      ordered: false, // Continue adding even if some entries fail
    });

    // Format the dates in the response
    const formattedHolidays = result.map((holiday) => ({
      ...holiday.toObject(),
      date: formatDateToLocal(holiday.date),
    }));

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { added: formattedHolidays.length, holidays: formattedHolidays },
          "Government holidays added successfully"
        )
      );
  } catch (error) {
    // Handle duplicate errors gracefully
    if (error.code === 11000) {
      throw new ApiError(400, "Some holidays already exist in the database.");
    }
    throw new ApiError(500, "Error adding government holidays.");
  }
});

// DELETE: Remove a holiday by date
const deleteHoliday = asyncHandler(async (req, res) => {
  const { date } = req.body;

  if (!date) {
    throw new ApiError(400, "Date is required to delete a holiday.");
  }

  // Find and delete the holiday
  const holiday = await Holiday.findOneAndDelete({ date });
  if (!holiday) {
    throw new ApiError(404, "Holiday not found for the specified date.");
  }

  // Optionally, update attendance status back to working day
  await Attendance.updateMany(
    { date },
    { status: "working" } // Adjust as needed
  );

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Holiday deleted successfully"));
});

// PUT: Update a holiday by date
const updateHoliday = asyncHandler(async (req, res) => {
  const { date, newDescription, newType } = req.body;

  if (!date) {
    throw new ApiError(400, "Date is required to update a holiday.");
  }

  // Find and update the holiday
  const holiday = await Holiday.findOne({ date });
  if (!holiday) {
    throw new ApiError(404, "Holiday not found for the specified date.");
  }

  // Update fields if provided
  if (newDescription) holiday.description = newDescription;
  if (newType) holiday.type = newType;

  await holiday.save();

  return res
    .status(200)
    .json(new ApiResponse(200, holiday, "Holiday updated successfully"));
});
// GET: Fetch all sorted holidays
const getAllSortedHolidays = asyncHandler(async (req, res) => {
  try {
    // Fetch all holidays (both admin and government)
    const holidays = await Holiday.find({})
      .select("date description type -_id")
      .sort({ date: 1 }); // Sort by date (ascending)

    // Format holidays' dates
    const formattedHolidays = holidays.map((holiday) => ({
      date: formatDateToLocal(holiday.date),
      description: holiday.description,
      type: holiday.type,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, formattedHolidays, "Holidays fetched successfully"));
  } catch (error) {
    throw new ApiError(500, "Error fetching sorted holidays.");
  }
});

export {
  markAttendance,
  getUserAttendance,
  getAllUsersAttendanceSummary,
  getSingleUserAttendanceSummary,
  addHoliday,
  getAllHolidays,
  addGovernmentHolidays,
  getAllSortedHolidays,
  deleteHoliday,
  updateHoliday
};
