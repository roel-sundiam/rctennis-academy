const mongoose = require('mongoose');

// Tracks lump-sum payments made against the total accumulated service charge.
const serviceChargePaymentSchema = new mongoose.Schema({
  amount:          { type: Number, required: true },
  paidAt:          { type: Date, required: true },
  paidBy:          { type: String, required: true },   // admin who recorded this
  paidTo:          { type: String, required: true },   // recipient e.g. "Roel Sundiam"
  paymentMethod:   { type: String, required: true },   // e.g. "gcash"
  accountNumber:   { type: String, default: null },    // e.g. "09175105185"
  referenceNumber: { type: String, default: null },
  notes:           { type: String, default: null },
  createdAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('ServiceChargePayment', serviceChargePaymentSchema);
