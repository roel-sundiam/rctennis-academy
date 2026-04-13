const mongoose = require('mongoose');

// Dynamically created admin accounts (managed via superadmin UI).
// Env-var accounts always take precedence for login.
const schema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
  createdBy:    { type: String, required: true },
  createdAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminAccount', schema);
