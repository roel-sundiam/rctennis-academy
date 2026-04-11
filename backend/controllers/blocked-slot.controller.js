const BlockedSlot = require('../models/BlockedSlot');
const Reservation = require('../models/Reservation');

async function getBlockedSlots(req, res, next) {
  try {
    const slots = await BlockedSlot.find().sort({ ReserveDate: 1, StartTime: 1 });
    res.json(slots);
  } catch (err) { next(err); }
}

async function getPublicBlockedSlots(req, res, next) {
  try {
    const { month } = req.query;
    const filter = month ? { ReserveDate: { $regex: `^${month}` } } : {};
    const slots = await BlockedSlot.find(filter, 'courtId ReserveDate StartTime EndTime reason')
      .sort({ ReserveDate: 1, StartTime: 1 });
    res.json(slots);
  } catch (err) { next(err); }
}

async function createBlockedSlot(req, res, next) {
  try {
    const { courtId, ReserveDate, StartTime, EndTime, reason } = req.body;
    if (!ReserveDate || !StartTime || !EndTime || !reason) {
      return res.status(400).json({ message: 'ReserveDate, StartTime, EndTime and reason are required.' });
    }
    if (StartTime >= EndTime) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }

    const court = courtId || 'Court1';

    // Check against existing pending or approved reservations
    const conflictingReservation = await Reservation.findOne({
      courtId: court,
      ReserveDate,
      status: { $in: ['pending', 'approved'] },
      StartTime: { $lt: EndTime },
      EndTime:   { $gt: StartTime }
    });
    if (conflictingReservation) {
      return res.status(409).json({
        message: `Cannot block this slot — ${conflictingReservation.playerName} has a ${conflictingReservation.status} booking from ${conflictingReservation.StartTime} to ${conflictingReservation.EndTime}.`
      });
    }

    // Check against existing blocked slots (no duplicate blocks)
    const conflictingBlock = await BlockedSlot.findOne({
      courtId: court,
      ReserveDate,
      StartTime: { $lt: EndTime },
      EndTime:   { $gt: StartTime }
    });
    if (conflictingBlock) {
      return res.status(409).json({
        message: `This slot is already blocked for: ${conflictingBlock.reason}.`
      });
    }

    const slot = new BlockedSlot({
      courtId: court,
      ReserveDate, StartTime, EndTime, reason,
      createdBy: req.admin.username
    });
    await slot.save();
    res.status(201).json(slot);
  } catch (err) { next(err); }
}

async function deleteBlockedSlot(req, res, next) {
  try {
    const slot = await BlockedSlot.findByIdAndDelete(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Blocked slot not found.' });
    res.json({ message: 'Blocked slot removed.' });
  } catch (err) { next(err); }
}

module.exports = { getBlockedSlots, getPublicBlockedSlots, createBlockedSlot, deleteBlockedSlot };
