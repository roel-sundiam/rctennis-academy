const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createReservation,
  getReservations,
  approveReservation,
  rejectReservation,
  getPublicSchedule
} = require('../controllers/reservation.controller');

router.get('/schedule',       getPublicSchedule);         // Public: calendar view
router.post('/',              createReservation);         // Public: players submit bookings
router.get('/',               auth, getReservations);     // Admin only
router.patch('/:id/approve',  auth, approveReservation);
router.patch('/:id/reject',   auth, rejectReservation);

module.exports = router;
