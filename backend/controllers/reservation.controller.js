const Reservation = require('../models/Reservation');
const Player = require('../models/Player');
const BlockedSlot = require('../models/BlockedSlot');

async function checkConflict(courtId, ReserveDate, StartTime, EndTime, excludeId = null) {
  const query = {
    courtId,
    ReserveDate,
    status: 'approved',
    StartTime: { $lt: EndTime },
    EndTime:   { $gt: StartTime }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return Reservation.findOne(query);
}

async function createReservation(req, res, next) {
  try {
    const { playerId, courtId, ReserveDate, StartTime, EndTime,
            paymentMade, paymentMethod, paymentAmount, paymentReference } = req.body;

    if (!playerId || !ReserveDate || !StartTime || !EndTime) {
      return res.status(400).json({ message: 'playerId, ReserveDate, StartTime, and EndTime are required.' });
    }
    if (StartTime >= EndTime) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }

    const player = await Player.findById(playerId);
    if (!player || !player.isActive) {
      return res.status(404).json({ message: 'Player not found.' });
    }

    const conflict = await checkConflict(courtId || 'Court1', ReserveDate, StartTime, EndTime);
    if (conflict) {
      return res.status(409).json({ message: 'This time slot is already booked. Please choose a different time.' });
    }

    const blocked = await BlockedSlot.findOne({
      courtId: courtId || 'Court1',
      ReserveDate,
      StartTime: { $lt: EndTime },
      EndTime:   { $gt: StartTime }
    });
    if (blocked) {
      return res.status(409).json({ message: `This time slot is blocked: ${blocked.reason}.` });
    }

    const paidFlag = paymentMade === true || paymentMade === 'true';
    const reservation = new Reservation({
      playerId,
      playerName: player.name,
      courtId: courtId || 'Court1',
      ReserveDate,
      StartTime,
      EndTime,
      status: 'pending',
      paymentMade:      paidFlag,
      paymentMethod:    paidFlag ? (paymentMethod || null) : null,
      paymentAmount:    paidFlag ? (paymentAmount != null ? Number(paymentAmount) : null) : null,
      paymentReference: paidFlag ? (paymentReference || null) : null,
    });
    await reservation.save();
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
}

async function getReservations(req, res, next) {
  try {
    const { status, paymentMade, from, to } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (paymentMade !== undefined) filter.paymentMade = paymentMade === 'true';
    if (from || to) {
      filter.ReserveDate = {};
      if (from) filter.ReserveDate.$gte = from;
      if (to)   filter.ReserveDate.$lte = to;
    }
    const reservations = await Reservation.find(filter)
      .sort({ ReserveDate: 1, StartTime: 1 });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

async function approveReservation(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: `Reservation is already ${reservation.status}.` });
    }

    // Re-check conflict at approval time (race condition guard)
    const conflict = await checkConflict(
      reservation.courtId,
      reservation.ReserveDate,
      reservation.StartTime,
      reservation.EndTime,
      reservation._id
    );
    if (conflict) {
      return res.status(409).json({ message: 'Cannot approve: this slot was already taken by another booking.' });
    }

    reservation.status = 'approved';
    reservation.approvedBy = req.admin.username;
    reservation.approvedAt = new Date();
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    next(err);
  }
}

async function rejectReservation(req, res, next) {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });
    if (reservation.status !== 'pending') {
      return res.status(400).json({ message: `Reservation is already ${reservation.status}.` });
    }

    reservation.status = 'rejected';
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    next(err);
  }
}

// Public: approved bookings for a given month (YYYY-MM), no auth required
async function getPublicSchedule(req, res, next) {
  try {
    const { month } = req.query; // e.g. "2026-04"
    const filter = { status: 'approved' };
    if (month) {
      filter.ReserveDate = { $regex: `^${month}` };
    }
    const reservations = await Reservation.find(filter, 'playerName courtId ReserveDate StartTime EndTime')
      .sort({ ReserveDate: 1, StartTime: 1 });
    res.json(reservations);
  } catch (err) {
    next(err);
  }
}

async function updateReservation(req, res, next) {
  try {
    const { playerName } = req.body;
    if (!playerName) return res.status(400).json({ message: 'playerName is required.' });
    const updated = await Reservation.findByIdAndUpdate(
      req.params.id, { playerName }, { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Reservation not found.' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function deleteReservation(req, res, next) {
  try {
    const deleted = await Reservation.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Reservation not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReservation, getReservations, approveReservation, rejectReservation, getPublicSchedule, updateReservation, deleteReservation };
