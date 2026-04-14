const mongoose = require('mongoose');

const blockedSlotSchema = new mongoose.Schema({
  courtId:     { type: String, required: true, default: 'Court1' },
  ReserveDate: { type: String, required: true },  // "YYYY-MM-DD"
  StartTime:   { type: String, required: true },  // "HH:MM"
  EndTime:     { type: String, required: true },  // "HH:MM"
  reason:      { type: String, required: true, trim: true },
  playerName:       { type: String, default: '' },
  createdBy:        { type: String, default: 'admin' },
  createdAt:        { type: Date, default: Date.now },
  isRecurring:      { type: Boolean, default: false },
  recurringGroupId: { type: String, default: null }
});

module.exports = mongoose.model('BlockedSlot', blockedSlotSchema);
