const mongoose = require('mongoose');

const loginEventSchema = new mongoose.Schema({
  username:  { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LoginEvent', loginEventSchema);
