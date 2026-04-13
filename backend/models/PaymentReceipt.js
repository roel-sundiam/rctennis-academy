const mongoose = require('mongoose');

const REASON_OPTIONS = [
  'Court Fee',
  'Training Fee',
  'Tournament Entry Fee',
  'Coaching Fee',
  'Equipment Rental',
  'Membership Fee',
  'Guest Fee',
  'Ball Purchase',
  'Locker Rental',
  'Other',
];

const paymentReceiptSchema = new mongoose.Schema({
  receiptNumber:    { type: String, required: true, unique: true },
  playerName:       { type: String, required: true },
  reason:           { type: String, required: true },
  paymentDate:      { type: Date, required: true },
  paymentMethod:    { type: String, enum: ['maya', 'gcash', 'bank_transfer_maybank', 'cash'], required: true },
  paymentReference: { type: String, default: null },
  baseAmount:       { type: Number, required: true },
  serviceCharge:    { type: Number, required: true },  // 2% of baseAmount
  totalAmount:      { type: Number, required: true },  // baseAmount + serviceCharge
  issuedBy:         { type: String, required: true },
  notes:            { type: String, default: null },
  createdAt:        { type: Date, default: Date.now },
});

module.exports = mongoose.model('PaymentReceipt', paymentReceiptSchema);
module.exports.REASON_OPTIONS = REASON_OPTIONS;
