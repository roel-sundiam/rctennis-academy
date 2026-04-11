const mongoose = require('mongoose');

const siteVisitSchema = new mongoose.Schema({
  page:      { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  userType:  { type: String, enum: ['anonymous', 'authenticated'], default: 'anonymous' },
  username:  { type: String, default: null },
  ipAddress: { type: String, default: null }
});

module.exports = mongoose.model('SiteVisit', siteVisitSchema);
