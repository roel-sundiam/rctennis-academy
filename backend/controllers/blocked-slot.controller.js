const crypto = require('crypto');
const BlockedSlot = require('../models/BlockedSlot');
const Reservation = require('../models/Reservation');

/**
 * Expand a recurring rule into individual "YYYY-MM-DD" date strings.
 * @param {number} dayOfWeek - 0=Sun, 1=Mon, ..., 6=Sat
 * @param {string} rangeStart - "YYYY-MM-DD"
 * @param {string} rangeEnd   - "YYYY-MM-DD"
 * @returns {string[]}
 */
function expandRecurringDates(dayOfWeek, rangeStart, rangeEnd) {
  const dates = [];
  // Parse as local midnight to avoid UTC-offset date drift
  const cursor = new Date(rangeStart + 'T00:00:00');
  const end    = new Date(rangeEnd   + 'T00:00:00');

  // Advance to first occurrence of the target day on or after rangeStart
  while (cursor.getDay() !== dayOfWeek) {
    cursor.setDate(cursor.getDate() + 1);
  }

  while (cursor <= end) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

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
    const slots = await BlockedSlot.find(filter, 'courtId ReserveDate StartTime EndTime reason playerName')
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

async function createRecurringBlockedSlots(req, res, next) {
  try {
    const { courtId, dayOfWeek, rangeStart, rangeEnd, StartTime, EndTime, reason, playerName } = req.body;

    // Validate required fields
    if (dayOfWeek === undefined || dayOfWeek === null || !rangeStart || !rangeEnd || !StartTime || !EndTime || !reason || !playerName) {
      return res.status(400).json({ message: 'dayOfWeek, rangeStart, rangeEnd, StartTime, EndTime, reason and playerName are required.' });
    }
    const dow = parseInt(dayOfWeek, 10);
    if (isNaN(dow) || dow < 0 || dow > 6) {
      return res.status(400).json({ message: 'dayOfWeek must be 0 (Sunday) through 6 (Saturday).' });
    }
    if (StartTime >= EndTime) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }
    if (rangeStart > rangeEnd) {
      return res.status(400).json({ message: 'Range start must be on or before range end.' });
    }

    // Cap at 366 days span (~52 weekly occurrences max)
    const startMs = new Date(rangeStart + 'T00:00:00').getTime();
    const endMs   = new Date(rangeEnd   + 'T00:00:00').getTime();
    if ((endMs - startMs) / 86400000 > 366) {
      return res.status(400).json({ message: 'Recurring range cannot exceed one year (366 days).' });
    }

    const court = courtId || 'Court1';
    const dates = expandRecurringDates(dow, rangeStart, rangeEnd);

    if (dates.length === 0) {
      return res.status(400).json({ message: 'No occurrences found for that day of week in the given date range.' });
    }

    // Batch conflict check — reservations
    const reservationConflicts = await Reservation.find({
      courtId: court,
      ReserveDate: { $in: dates },
      status: { $in: ['pending', 'approved'] },
      StartTime: { $lt: EndTime },
      EndTime:   { $gt: StartTime }
    });
    if (reservationConflicts.length > 0) {
      const conflictDates = [...new Set(reservationConflicts.map(r => r.ReserveDate))].join(', ');
      return res.status(409).json({ message: `Cannot block — existing reservation(s) conflict on: ${conflictDates}.` });
    }

    // Batch conflict check — existing blocked slots
    const blockConflicts = await BlockedSlot.find({
      courtId: court,
      ReserveDate: { $in: dates },
      StartTime: { $lt: EndTime },
      EndTime:   { $gt: StartTime }
    });
    if (blockConflicts.length > 0) {
      const conflictDates = [...new Set(blockConflicts.map(b => b.ReserveDate))].join(', ');
      return res.status(409).json({ message: `Slot already blocked on: ${conflictDates}.` });
    }

    const groupId = crypto.randomUUID();

    const docs = dates.map(date => ({
      courtId: court,
      ReserveDate: date,
      StartTime,
      EndTime,
      reason,
      playerName: playerName.trim(),
      isRecurring: true,
      recurringGroupId: groupId,
      createdBy: req.admin.username
    }));

    const created = await BlockedSlot.insertMany(docs);
    res.status(201).json({ count: created.length, recurringGroupId: groupId, slots: created });
  } catch (err) { next(err); }
}

async function deleteBlockedSlotGroup(req, res, next) {
  try {
    const { groupId } = req.params;
    const result = await BlockedSlot.deleteMany({ recurringGroupId: groupId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No slots found for that group ID.' });
    }
    res.json({ message: `Deleted ${result.deletedCount} blocked slot(s).`, deletedCount: result.deletedCount });
  } catch (err) { next(err); }
}

module.exports = {
  getBlockedSlots,
  getPublicBlockedSlots,
  createBlockedSlot,
  deleteBlockedSlot,
  createRecurringBlockedSlots,
  deleteBlockedSlotGroup
};
