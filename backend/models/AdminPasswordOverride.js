const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  updatedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminPasswordOverride', schema);
