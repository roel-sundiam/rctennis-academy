const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  contactNumber: { type: String, default: '' },
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Player', playerSchema);
