// models/calendar.model.js
import mongoose from 'mongoose';

const CalendarSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: "YYYY-MM-DD"
  holiday: { type: Boolean, default: false },
  holidayName: { type: String },
  workday: { type: Boolean, default: true },
});

export const Calendar = mongoose.model('Calendar', CalendarSchema);
