const crypto = require('crypto');
const BlockedSlot = require('../models/BlockedSlot');
const Reservation = require('../models/Reservation');

function toDateStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function expandDailyDates(rangeStart, rangeEnd) {
  const dates  = [];
  const cursor = new Date(rangeStart + 'T00:00:00');
  const end    = new Date(rangeEnd   + 'T00:00:00');
  while (cursor <= end) {
    dates.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function expandWeeklyDates(dayOfWeek, rangeStart, rangeEnd) {
  const dates  = [];
  const cursor = new Date(rangeStart + 'T00:00:00');
  const end    = new Date(rangeEnd   + 'T00:00:00');
  while (cursor.getDay() !== dayOfWeek) cursor.setDate(cursor.getDate() + 1);
  while (cursor <= end) {
    dates.push(toDateStr(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

function expandMonthlyDates(rangeStart, rangeEnd) {
  const start      = new Date(rangeStart + 'T00:00:00');
  const end        = new Date(rangeEnd   + 'T00:00:00');
  const targetDay  = start.getDate();
  const dates      = [];
  let year  = start.getFullYear();
  let month = start.getMonth();
  while (true) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const day = Math.min(targetDay, daysInMonth);
    const d   = new Date(year, month, day);
    if (d > end) break;
    if (d >= start) dates.push(toDateStr(d));
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return dates;
}

function expandYearlyDates(rangeStart, rangeEnd) {
  const start       = new Date(rangeStart + 'T00:00:00');
  const end         = new Date(rangeEnd   + 'T00:00:00');
  const targetMonth = start.getMonth();
  const targetDay   = start.getDate();
  const dates       = [];
  for (let year = start.getFullYear(); ; year++) {
    const daysInMonth = new Date(year, targetMonth + 1, 0).getDate();
    const day = Math.min(targetDay, daysInMonth);
    const d   = new Date(year, targetMonth, day);
    if (d > end) break;
    if (d >= start) dates.push(toDateStr(d));
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
    const { courtId, recurrenceType, dayOfWeek, rangeStart, rangeEnd, StartTime, EndTime, reason, playerName } = req.body;

    // Validate required fields
    const type = recurrenceType || 'weekly';
    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(type)) {
      return res.status(400).json({ message: 'recurrenceType must be daily, weekly, monthly, or yearly.' });
    }
    if (!rangeStart || !rangeEnd || !StartTime || !EndTime || !reason || !playerName) {
      return res.status(400).json({ message: 'rangeStart, rangeEnd, StartTime, EndTime, reason and playerName are required.' });
    }
    if (type === 'weekly') {
      if (dayOfWeek === undefined || dayOfWeek === null) {
        return res.status(400).json({ message: 'dayOfWeek is required for weekly recurrence.' });
      }
      const dow = parseInt(dayOfWeek, 10);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        return res.status(400).json({ message: 'dayOfWeek must be 0 (Sunday) through 6 (Saturday).' });
      }
    }
    if (StartTime >= EndTime) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }
    if (rangeStart > rangeEnd) {
      return res.status(400).json({ message: 'Range start must be on or before range end.' });
    }

    // Cap span by recurrence type
    const startMs = new Date(rangeStart + 'T00:00:00').getTime();
    const endMs   = new Date(rangeEnd   + 'T00:00:00').getTime();
    const spanDays = (endMs - startMs) / 86400000;
    const caps = { daily: 366, weekly: 366, monthly: 1825, yearly: 3650 };
    if (spanDays > caps[type]) {
      const labels = { daily: '1 year', weekly: '1 year', monthly: '5 years', yearly: '10 years' };
      return res.status(400).json({ message: `Recurring range cannot exceed ${labels[type]} for ${type} recurrence.` });
    }

    const court = courtId || 'Court1';
    let dates;
    if (type === 'daily') {
      dates = expandDailyDates(rangeStart, rangeEnd);
    } else if (type === 'weekly') {
      dates = expandWeeklyDates(parseInt(dayOfWeek, 10), rangeStart, rangeEnd);
    } else if (type === 'monthly') {
      dates = expandMonthlyDates(rangeStart, rangeEnd);
    } else {
      dates = expandYearlyDates(rangeStart, rangeEnd);
    }

    if (dates.length === 0) {
      return res.status(400).json({ message: 'No occurrences found in the given date range.' });
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
