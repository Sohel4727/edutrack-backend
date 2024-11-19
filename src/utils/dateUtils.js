import { parseISO, format, eachDayOfInterval, isSunday } from 'date-fns';

// Function to get working days and Sundays for a given month and year
export const getWorkingDaysWithSundays = (year, month) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of the month

  // Generate all days in the month
  const daysInMonth = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const workingDays = daysInMonth.filter(date => !isSunday(date)); // Exclude Sundays from working days
  const sundays = daysInMonth.filter(date => isSunday(date)); // Get Sundays

  return { workingDays, sundays };
};
