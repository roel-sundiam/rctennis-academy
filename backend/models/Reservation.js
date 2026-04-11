const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  playerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName:  { type: String, required: true },
  courtId:     { type: String, required: true, default: 'Court1' },
  ReserveDate: { type: String, required: true },  // "YYYY-MM-DD"
  StartTime:   { type: String, required: true },  // "HH:MM"
  EndTime:     { type: String, required: true },  // "HH:MM"
  status:      {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  createdAt:   { type: Date, default: Date.now },
  approvedBy:  { type: String, default: null },
  approvedAt:  { type: Date, default: null },
  paymentMade:      { type: Boolean, default: false },
  paymentMethod:    { type: String, enum: ['maya', 'gcash', 'bank_transfer_maybank', 'cash'], default: null },
  paymentAmount:    { type: Number, default: null },
  paymentReference: { type: String, default: null }
});

module.exports = mongoose.model('Reservation', reservationSchema);
