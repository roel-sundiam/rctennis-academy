const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  date:        { type: String, required: true },  // "YYYY-MM-DD"
  time:        { type: String, required: true },  // "HH:MM"
  player1:     { type: String, required: true },
  player2:     { type: String, required: true },
  court:       { type: String, required: true, default: 'Court 1' },
  result:      { type: String, default: null },   // e.g. "6-3 7-5"
});

const tournamentSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  startDate:  { type: String, required: true },  // "YYYY-MM-DD"
  endDate:    { type: String, required: true },  // "YYYY-MM-DD"
  location:   { type: String, required: true, trim: true },
  status:     { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  createdBy:  { type: String, default: null },
  createdAt:  { type: Date, default: Date.now },
  matches:    [matchSchema],
});

module.exports = mongoose.model('Tournament', tournamentSchema);
